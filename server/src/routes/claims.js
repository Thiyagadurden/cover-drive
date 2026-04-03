const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const generateClaimNumber = () => {
  const prefix = 'CLM';
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${ts}-${rand}`;
};

// GET /api/claims/my
router.get('/my', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        insurance_policies(policy_number, plan_type),
        disruption_triggers(title, trigger_type, severity)
      `)
      .eq('partner_id', req.partner.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ claims: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// POST /api/claims/manual — partner files a claim manually
router.post('/manual', protect, async (req, res) => {
  try {
    const { disruption_type, disruption_start, disruption_end, description } = req.body;

    if (!disruption_type || !disruption_start) {
      return res.status(400).json({ error: 'Disruption type and start time are required' });
    }

    // Get active policy
    const { data: policy } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('partner_id', req.partner.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!policy) {
      return res.status(400).json({ error: 'No active policy found. Please buy a policy first.' });
    }

    // Check claims count this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const { count } = await supabase
      .from('claims')
      .select('id', { count: 'exact' })
      .eq('partner_id', req.partner.id)
      .gte('created_at', weekStart.toISOString())
      .in('status', ['pending', 'under_review', 'approved', 'paid']);

    if (count >= policy.max_claims_per_week) {
      return res.status(400).json({
        error: `You've reached the maximum ${policy.max_claims_per_week} claims allowed this week.`
      });
    }

    // Estimate hours lost
    const start = new Date(disruption_start);
    const end = disruption_end ? new Date(disruption_end) : new Date();
    const hours_lost = Math.min(((end - start) / (1000 * 60 * 60)).toFixed(2), 8);

    // Calculate payout
    const { data: partner } = await supabase
      .from('delivery_partners')
      .select('avg_daily_earnings')
      .eq('id', req.partner.id)
      .single();

    const hourly_rate = (partner.avg_daily_earnings || 800) / 8;
    const payout = Math.min(
      (hourly_rate * hours_lost).toFixed(2),
      policy.coverage_amount
    );

    const { data: claim, error } = await supabase
      .from('claims')
      .insert({
        policy_id:          policy.id,
        partner_id:         req.partner.id,
        claim_number:       generateClaimNumber(),
        claim_type:         'manual',
        status:             'under_review',
        disruption_type,
        disruption_start,
        disruption_end:     disruption_end || new Date().toISOString(),
        estimated_hours_lost: hours_lost,
        daily_avg_earnings: partner.avg_daily_earnings,
        payout_amount:      payout,
        ai_assessment:      `Manual claim for ${disruption_type}. Estimated ${hours_lost} hours of income lost. Payout: ₹${payout}`,
        ai_confidence:      0.75,
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Claim submitted successfully! It will be reviewed within 24 hours.',
      claim
    });

  } catch (err) {
    console.error('[Claims Error]', err);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// GET /api/claims/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        insurance_policies(policy_number, plan_type, weekly_premium),
        disruption_triggers(title, trigger_type, severity, description)
      `)
      .eq('id', req.params.id)
      .eq('partner_id', req.partner.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Claim not found' });
    res.json({ claim: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

module.exports = router;