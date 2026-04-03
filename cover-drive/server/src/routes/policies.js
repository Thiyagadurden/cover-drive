const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { protect } = require('../middleware/auth');
const supabase = require('../utils/supabase');

// Helper: generate policy number
const generatePolicyNumber = () => {
  const prefix = 'CD';
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${rand}`;
};

// GET /api/policies/my — get active policy
router.get('/my', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('partner_id', req.partner.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ policies: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// POST /api/policies/buy — purchase a new weekly policy
router.post('/buy', protect, async (req, res) => {
  try {
    const { weekly_premium, coverage_amount, plan_type, ai_risk_score, premium_breakdown } = req.body;

    if (!weekly_premium || !coverage_amount) {
      return res.status(400).json({ error: 'Premium and coverage are required' });
    }

    // Check if partner already has an active policy
    const { data: existing } = await supabase
      .from('insurance_policies')
      .select('id, status, coverage_end_date')
      .eq('partner_id', req.partner.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: 'You already have an active policy',
        existing_policy: existing
      });
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);

    const max_claims = plan_type === 'basic' ? 2 : plan_type === 'premium' ? 5 : 3;

    const { data: policy, error } = await supabase
      .from('insurance_policies')
      .insert({
        partner_id:          req.partner.id,
        policy_number:       generatePolicyNumber(),
        status:              'active',
        plan_type:           plan_type || 'standard',
        weekly_premium:      weekly_premium,
        coverage_amount:     coverage_amount,
        max_claims_per_week: max_claims,
        coverage_start_date: today.toISOString().split('T')[0],
        coverage_end_date:   endDate.toISOString().split('T')[0],
        auto_renew:          true,
        ai_risk_score:       ai_risk_score || null,
        premium_breakdown:   premium_breakdown || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: `Policy activated! You're covered until ${endDate.toDateString()}.`,
      policy
    });

  } catch (err) {
    console.error('[Policy Buy Error]', err);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// PUT /api/policies/:id/renew
router.put('/:id/renew', protect, async (req, res) => {
  try {
    const { data: policy } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('id', req.params.id)
      .eq('partner_id', req.partner.id)
      .single();

    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    const newEnd = new Date(policy.coverage_end_date);
    newEnd.setDate(newEnd.getDate() + 7);

    const { data, error } = await supabase
      .from('insurance_policies')
      .update({
        status: 'active',
        coverage_end_date: newEnd.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ message: 'Policy renewed for 7 more days!', policy: data });
  } catch (err) {
    res.status(500).json({ error: 'Renewal failed' });
  }
});

// PUT /api/policies/:id/cancel
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('partner_id', req.partner.id)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ message: 'Policy cancelled', policy: data });
  } catch (err) {
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

module.exports = router;