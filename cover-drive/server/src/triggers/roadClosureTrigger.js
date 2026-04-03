const supabase = require('../utils/supabase');
const { processAutoClaims } = require('./autoClaimProcessor');

// Mock NHAI / Traffic Police road closure data
const MOCK_ROAD_CLOSURES = [
  {
    route:       'OMR (Old Mahabalipuram Road)',
    city:        'Chennai',
    zones:       ['CHN-SHO', 'CHN-VEL', 'CHN-PER'],
    reason:      'Waterlogged underpass — vehicles stranded',
    severity:    'high',
    active:      Math.random() < 0.05,
  },
  {
    route:       'Eastern Express Highway',
    city:        'Mumbai',
    zones:       ['MUM-KUR', 'MUM-AND'],
    reason:      'Major accident causing full road blockage',
    severity:    'critical',
    active:      Math.random() < 0.03,
  },
  {
    route:       'Outer Ring Road',
    city:        'Bengaluru',
    zones:       ['BLR-MAR', 'BLR-WHI'],
    reason:      'Metro construction — partial road closure',
    severity:    'medium',
    active:      Math.random() < 0.06,
  },
  {
    route:       'Tank Bund Road',
    city:        'Hyderabad',
    zones:       ['HYD-HIT'],
    reason:      'VIP movement — temporary road closure',
    severity:    'low',
    active:      Math.random() < 0.04,
  },
];

async function runRoadClosureTrigger() {
  console.log('[RoadClosureTrigger] Checking road status...');

  try {
    const activeClosures = MOCK_ROAD_CLOSURES.filter(c => c.active);

    if (!activeClosures.length) {
      console.log('[RoadClosureTrigger] No active road closures');
      return;
    }

    for (const closure of activeClosures) {
      // Check for existing trigger in last 4h
      const fourHoursAgo = new Date(Date.now() - 14400000).toISOString();
      const { data: existing } = await supabase
        .from('disruption_triggers')
        .select('id')
        .eq('trigger_type', 'road_closure')
        .eq('is_active', true)
        .gte('triggered_at', fourHoursAgo)
        .contains('affected_zones', [closure.zones[0]])
        .maybeSingle();

      if (existing) {
        console.log(`[RoadClosureTrigger] Already active for ${closure.route}`);
        continue;
      }

      const { data: trigger } = await supabase
        .from('disruption_triggers')
        .insert({
          trigger_type:   'road_closure',
          severity:       closure.severity,
          affected_zones: closure.zones,
          title:          `Road Closure — ${closure.route} (${closure.city})`,
          description:    `${closure.reason}. Affected zones: ${closure.zones.join(', ')}. Delivery routes severely impacted.`,
          api_source:     'Mock-NHAI-TrafficPolice',
          raw_payload:    { mock: true, ...closure },
          is_active:      true,
        })
        .select('id')
        .single();

      if (trigger) {
        await processAutoClaims(trigger.id, closure.zones, 'road_closure', closure.severity);
        console.log(`[RoadClosureTrigger] 🚧 ${closure.route} closed — ${closure.severity}`);
      }
    }
  } catch (err) {
    console.error('[RoadClosureTrigger] Error:', err.message);
  }
}

module.exports = { runRoadClosureTrigger };
