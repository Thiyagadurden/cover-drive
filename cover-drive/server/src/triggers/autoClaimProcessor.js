const supabase = require('../utils/supabase');

const generateClaimNumber = () => {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900);
  return `CLM-AUTO-${ts}-${rand}`;
};

async function processAutoClaims(triggerId, affectedZones, disruptionType, severity) {
  console.log(`[AutoClaim] Processing for zones: ${affectedZones.join(', ')}`);

  // Find all partners in affected zones with active policies
  const { data: partners, error } = await supabase
    .from('delivery_partners')
    .select(`
      id, avg_daily_earnings, zone, city,
      insurance_policies!inner(
        id, status, coverage_amount, max_claims_per_week
      )
    `)
    .in('zone', affectedZones)
    .eq('insurance_policies.status', 'active');

  if (error || !partners?.length) {
    console.log(`[AutoClaim] No active partners found in affected zones`);
    return { processed: 0 };
  }

  const severityMultiplier = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
  const mult = severityMultiplier[severity] || 0.5;

  let processed = 0;
  const now = new Date();

  for (const partner of partners) {
    try {
      const policy = partner.insurance_policies[0];

      // Check weekly claim count
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const { count } = await supabase
        .from('claims')
        .select('id', { count: 'exact' })
        .eq('partner_id', partner.id)
        .gte('created_at', weekStart.toISOString())
        .in('status', ['pending', 'under_review', 'approved', 'paid']);

      if (count >= policy.max_claims_per_week) continue;

      const hourly_rate = (partner.avg_daily_earnings || 800) / 8;
      const hours_lost = mult * 4; // max 4 hours per trigger
      const payout = Math.min(
        parseFloat((hourly_rate * hours_lost).toFixed(2)),
        parseFloat(policy.coverage_amount)
      );

      await supabase.from('claims').insert({
        policy_id:            policy.id,
        partner_id:           partner.id,
        trigger_id:           triggerId,
        claim_number:         generateClaimNumber(),
        claim_type:           'auto',
        status:               'approved',
        disruption_type:      disruptionType,
        disruption_start:     now.toISOString(),
        disruption_end:       new Date(now.getTime() + hours_lost * 3600000).toISOString(),
        estimated_hours_lost: hours_lost,
        daily_avg_earnings:   partner.avg_daily_earnings || 800,
        payout_amount:        payout,
        ai_assessment:        `Auto-approved: ${disruptionType} (${severity} severity) detected in ${partner.zone}. Estimated ${hours_lost}h income loss.`,
        ai_confidence:        0.92,
      });

      processed++;
    } catch (e) {
      console.error(`[AutoClaim] Error for partner ${partner.id}:`, e.message);
    }
  }

  console.log(`[AutoClaim] ✅ Filed ${processed} auto-claims`);
  return { processed };
}

module.exports = { processAutoClaims };