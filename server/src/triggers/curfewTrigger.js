const supabase = require('../utils/supabase');
const { processAutoClaims } = require('./autoClaimProcessor');

// Mock government emergency notification API
// Production: integrate with https://sachet.ndma.gov.in or state DM portals
function getMockCurfewData() {
  const now = new Date();
  const hour = now.getHours();

  return [
    {
      order_type:   'section_144',
      city:         'Chennai',
      zones:        ['CHN-PER', 'CHN-TNG'],
      severity:     'high',
      title:        'Section 144 — Perambur & T. Nagar',
      description:  'Section 144 CrPC imposed. All public movement restricted. Delivery operations halted.',
      active:       Math.random() < 0.06, // 6% chance
      issued_by:    'Chennai City Police',
    },
    {
      order_type:   'protest_block',
      city:         'Mumbai',
      zones:        ['MUM-KUR'],
      severity:     'medium',
      title:        'Road Blockade — Kurla',
      description:  'Political protest causing complete road blockade. Deliveries impossible.',
      active:       Math.random() < 0.04,
      issued_by:    'Mumbai Traffic Police',
    },
    {
      order_type:   'night_curfew',
      city:         'All',
      zones:        ['CHN-ANN','CHN-VEL','MUM-BAN','BLR-KOR'],
      severity:     'medium',
      title:        'Night Curfew 10 PM – 5 AM',
      description:  'Night curfew imposed. No movement allowed between 10 PM and 5 AM.',
      active:       (hour >= 22 || hour < 5) && Math.random() < 0.3,
      issued_by:    'State Government',
    },
  ];
}

async function runCurfewTrigger() {
  console.log('[CurfewTrigger] Checking government orders...');

  try {
    const orders = getMockCurfewData();
    const activeOrders = orders.filter(o => o.active);

    if (!activeOrders.length) {
      console.log('[CurfewTrigger] No active curfew orders');
      return;
    }

    for (const order of activeOrders) {
      // Check existing
      const threeHoursAgo = new Date(Date.now() - 10800000).toISOString();
      const { data: existing } = await supabase
        .from('disruption_triggers')
        .select('id')
        .eq('trigger_type', 'curfew_lockdown')
        .eq('is_active', true)
        .gte('triggered_at', threeHoursAgo)
        .contains('affected_zones', [order.zones[0]])
        .maybeSingle();

      if (existing) continue;

      const { data: trigger } = await supabase
        .from('disruption_triggers')
        .insert({
          trigger_type:   'curfew_lockdown',
          severity:       order.severity,
          affected_zones: order.zones,
          title:          order.title,
          description:    `${order.description} Issued by: ${order.issued_by}`,
          api_source:     'Mock-Govt-Emergency-API',
          raw_payload:    order,
          is_active:      true,
        })
        .select('id')
        .single();

      if (trigger) {
        await processAutoClaims(trigger.id, order.zones, 'curfew_lockdown', order.severity);
        console.log(`[CurfewTrigger] 🚨 ${order.title} — ${order.zones.join(', ')}`);
      }
    }
  } catch (err) {
    console.error('[CurfewTrigger] Error:', err.message);
  }
}

module.exports = { runCurfewTrigger };