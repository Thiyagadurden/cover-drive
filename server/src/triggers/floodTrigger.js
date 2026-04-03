const supabase = require('../utils/supabase');
const { processAutoClaims } = require('./autoClaimProcessor');

// Mock NDMA/IMD flood watch data
const MOCK_FLOOD_DATABASE = [
  { zone_code: 'CHN-VEL', zone_name: 'Velachery',      city: 'Chennai',   flood_level: 'high',   waterlogging: true  },
  { zone_code: 'CHN-ADY', zone_name: 'Adyar',          city: 'Chennai',   flood_level: 'critical', waterlogging: true },
  { zone_code: 'MUM-KUR', zone_name: 'Kurla',          city: 'Mumbai',    flood_level: 'high',   waterlogging: true  },
  { zone_code: 'CHN-PER', zone_name: 'Perambur',       city: 'Chennai',   flood_level: 'medium', waterlogging: false },
  { zone_code: 'BLR-MAR', zone_name: 'Marathahalli',   city: 'Bengaluru', flood_level: 'low',    waterlogging: false },
];

async function runFloodTrigger() {
  console.log('[FloodTrigger] Checking waterlogging data...');

  // In production: call https://ndma.gov.in/api or India-WRIS API
  // Here we use mock + zone flood_risk_score from our own DB
  try {
    // Fetch high-risk zones from our DB
    const { data: zones } = await supabase
      .from('zones')
      .select('zone_code, zone_name, city, flood_risk_score')
      .gte('flood_risk_score', 7.5)
      .eq('is_active', true);

    if (!zones?.length) return;

    // Simulate flood condition: only trigger if mock says waterlogged
    const floodedZones = MOCK_FLOOD_DATABASE.filter(z => z.waterlogging && z.flood_level !== 'low');
    const floodedCodes = floodedZones.map(z => z.zone_code);
    const matchingZones = zones.filter(z => floodedCodes.includes(z.zone_code));

    if (!matchingZones.length) {
      console.log('[FloodTrigger] No active flooding detected');
      return;
    }

    // Group by city
    const byCity = {};
    matchingZones.forEach(z => {
      if (!byCity[z.city]) byCity[z.city] = [];
      byCity[z.city].push(z.zone_code);
    });

    for (const [city, zoneCodes] of Object.entries(byCity)) {
      const cityFlood = floodedZones.find(z => z.city === city);
      const severity  = cityFlood?.flood_level || 'medium';

      // Check for existing trigger in last 6h
      const sixHoursAgo = new Date(Date.now() - 21600000).toISOString();
      const { data: existing } = await supabase
        .from('disruption_triggers')
        .select('id')
        .eq('trigger_type', 'zone_flood')
        .eq('is_active', true)
        .gte('triggered_at', sixHoursAgo)
        .contains('affected_zones', [zoneCodes[0]])
        .maybeSingle();

      if (existing) {
        console.log(`[FloodTrigger] Already active for ${city}`);
        continue;
      }

      const { data: trigger } = await supabase
        .from('disruption_triggers')
        .insert({
          trigger_type:   'zone_flood',
          severity,
          affected_zones: zoneCodes,
          title:          `Waterlogging / Flooding — ${city}`,
          description:    `Severe waterlogging reported in ${zoneCodes.length} zone(s) of ${city}. Delivery operations severely impacted.`,
          api_source:     'Mock-NDMA-FloodWatch',
          raw_payload:    { mock: true, affected_zones: zoneCodes, severity, city },
          is_active:      true,
        })
        .select('id')
        .single();

      if (trigger) {
        await processAutoClaims(trigger.id, zoneCodes, 'zone_flood', severity);
        console.log(`[FloodTrigger] 🌊 Flood alert for ${city} — ${zoneCodes.join(', ')}`);
      }
    }
  } catch (err) {
    console.error('[FloodTrigger] Error:', err.message);
  }
}

module.exports = { runFloodTrigger };