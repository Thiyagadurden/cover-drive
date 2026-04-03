const axios = require('axios');
const supabase = require('../utils/supabase');
const { processAutoClaims } = require('./autoClaimProcessor');

// Track outage start times in memory
const outageTracker = {};

// Mock Downdetector-style status endpoint (simulated)
async function checkPlatformStatus(platform) {
  // In production: scrape downdetector.in or use Statuspage API
  // Mock: randomly simulate outages (5% chance)
  const mockStatuses = {
    zomato: {
      name: 'Zomato',
      status: Math.random() < 0.05 ? 'outage' : 'operational',
      report_count: Math.floor(Math.random() * 500),
      affected_regions: ['Chennai', 'Mumbai', 'Bengaluru'],
    },
    swiggy: {
      name: 'Swiggy',
      status: Math.random() < 0.04 ? 'degraded' : 'operational',
      report_count: Math.floor(Math.random() * 300),
      affected_regions: ['Chennai', 'Hyderabad'],
    },
  };

  return mockStatuses[platform] || null;
}

const ALL_ZONES = [
  'CHN-ANN','CHN-VEL','CHN-TNG','CHN-TAM','CHN-SHO',
  'CHN-PER','CHN-ADY','CHN-CHR','CHN-POR','CHN-KOD',
  'MUM-KUR','MUM-BAN','MUM-AND',
  'BLR-KOR','BLR-WHI','BLR-MAR',
  'HYD-HIT','HYD-LBN',
];

async function runAppOutageTrigger() {
  console.log('[AppOutageTrigger] Checking platform status...');

  for (const platform of ['zomato', 'swiggy']) {
    try {
      const status = await checkPlatformStatus(platform);
      if (!status) continue;

      const isDown = ['outage', 'degraded', 'partial_outage'].includes(status.status);

      if (isDown) {
        if (!outageTracker[platform]) {
          outageTracker[platform] = { startTime: Date.now() };
          console.log(`[AppOutageTrigger] ${platform} outage started, monitoring...`);
        }

        const durationHours = (Date.now() - outageTracker[platform].startTime) / 3600000;

        // Only trigger claim if outage > 1.5 hours
        if (durationHours >= 1.5) {
          const severity = status.report_count > 400 ? 'critical'
                         : status.report_count > 200 ? 'high'
                         : status.report_count > 100 ? 'medium' : 'low';

          const { data: existing } = await supabase
            .from('disruption_triggers')
            .select('id')
            .eq('trigger_type', 'app_outage')
            .eq('is_active', true)
            .ilike('title', `%${status.name}%`)
            .maybeSingle();

          if (!existing) {
            const { data: trigger } = await supabase
              .from('disruption_triggers')
              .insert({
                trigger_type:   'app_outage',
                severity,
                affected_zones: ALL_ZONES,
                title:          `${status.name} App Outage`,
                description:    `${status.name} platform is ${status.status}. ${status.report_count} reports in last hour. Delivery partners unable to receive orders.`,
                api_source:     'Mock-Downdetector',
                raw_payload:    status,
                is_active:      true,
              })
              .select('id')
              .single();

            if (trigger) {
              await processAutoClaims(trigger.id, ALL_ZONES, 'app_outage', severity);
              console.log(`[AppOutageTrigger] 📱 ${status.name} outage alert fired — ${severity}`);
            }
          }
        }
      } else {
        // Platform recovered — resolve trigger
        if (outageTracker[platform]) {
          delete outageTracker[platform];
          await supabase
            .from('disruption_triggers')
            .update({ is_active: false, resolved_at: new Date().toISOString() })
            .eq('trigger_type', 'app_outage')
            .ilike('title', `%${status.name}%`)
            .eq('is_active', true);
          console.log(`[AppOutageTrigger] ✅ ${status.name} recovered`);
        }
      }
    } catch (err) {
      console.error(`[AppOutageTrigger] Error for ${platform}:`, err.message);
    }
  }
}

module.exports = { runAppOutageTrigger };