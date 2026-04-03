const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const supabase = require('../utils/supabase');

// POST /api/premium/calculate
router.post('/calculate', protect, async (req, res) => {
  try {
    const partnerId = req.partner.id;

    // Fetch full partner profile
    const { data: partner } = await supabase
      .from('delivery_partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    // Fetch zone data
    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('zone_name', partner.zone)
      .eq('city', partner.city)
      .maybeSingle();

    const features = {
      zone_flood_risk:             zone?.flood_risk_score        || 5.0,
      weather_risk_score:          req.body.weather_risk_score   || 5.0,
      app_downtime_7d:             zone?.app_downtime_avg_weekly || 2.0,
      partner_rating:              partner.partner_rating        || 4.0,
      active_hours_weekly:         partner.active_hours_weekly   || 40,
      historical_claim_rate_zone:  zone?.historical_claim_rate   || 0.15,
      curfew_risk_score:           zone?.curfew_risk_score       || 1.0,
    };

    let weekly_premium = 99; // fallback if AI engine is down

    try {
      const aiResponse = await axios.post(
        `${process.env.AI_ENGINE_URL}/predict-premium`,
        { features },
        { timeout: 5000 }
      );
      weekly_premium = aiResponse.data.weekly_premium;
    } catch (aiErr) {
      console.warn('[AI Engine] Fallback to rule-based pricing');
      // Simple rule-based fallback
      let base = 99;
      if (features.zone_flood_risk > 7) base += 20;
      if (features.weather_risk_score > 7) base += 15;
      if (features.partner_rating > 4.5) base -= 10;
      if (features.historical_claim_rate_zone > 0.25) base += 15;
      weekly_premium = Math.min(Math.max(Math.round(base), 69), 149);
    }

    // Calculate coverage
    const daily_avg = partner.avg_daily_earnings || 800;
    const coverage_amount = daily_avg * 3; // 3 days of earnings

    // Determine plan
    const plan_type = weekly_premium <= 85 ? 'basic'
                    : weekly_premium <= 115 ? 'standard'
                    : 'premium';

    // Log to audit table
    await supabase.from('premium_audit_log').insert({
      partner_id:  partnerId,
      new_premium: weekly_premium,
      features_used: features,
    });

    res.json({
      weekly_premium,
      coverage_amount,
      plan_type,
      features,
      breakdown: {
        base_premium: 99,
        zone_adjustment:    features.zone_flood_risk > 7 ? '+₹20' : features.zone_flood_risk < 4 ? '-₹10' : '₹0',
        weather_adjustment: features.weather_risk_score > 7 ? '+₹15' : '₹0',
        rating_discount:    features.partner_rating > 4.5 ? '-₹10' : '₹0',
        claim_adjustment:   features.historical_claim_rate_zone > 0.25 ? '+₹15' : '₹0',
        final:              `₹${weekly_premium}`,
      }
    });

  } catch (err) {
    console.error('[Premium Error]', err);
    res.status(500).json({ error: 'Failed to calculate premium' });
  }
});

module.exports = router;