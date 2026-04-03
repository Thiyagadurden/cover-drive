const cron = require('node-cron');
const { runWeatherTrigger }      = require('./weatherTrigger');
const { runFloodTrigger }        = require('./floodTrigger');
const { runAppOutageTrigger }    = require('./appOutageTrigger');
const { runCurfewTrigger }       = require('./curfewTrigger');
const { runRoadClosureTrigger }  = require('./roadClosureTrigger');
const supabase                   = require('../utils/supabase');

async function runAllTriggers() {
  console.log(`\n[Cron] ── Running all 5 disruption checks ──`);
  await Promise.allSettled([
    runWeatherTrigger(),
    runFloodTrigger(),
    runAppOutageTrigger(),
    runCurfewTrigger(),
    runRoadClosureTrigger(),
  ]);
  console.log(`[Cron] ── All checks complete ──\n`);
}

// Auto-resolve triggers older than 8 hours
async function resolveOldTriggers() {
  const eightHoursAgo = new Date(Date.now() - 28800000).toISOString();
  const { count } = await supabase
    .from('disruption_triggers')
    .update({ is_active: false, resolved_at: new Date().toISOString() })
    .eq('is_active', true)
    .lt('triggered_at', eightHoursAgo);
  if (count) console.log(`[Cron] Auto-resolved ${count} old triggers`);
}

// Run immediately on server start
setTimeout(runAllTriggers, 3000);

// Every 30 minutes
cron.schedule('*/30 * * * *', runAllTriggers);

// Resolve old triggers every hour
cron.schedule('0 * * * *', resolveOldTriggers);

console.log('⏰ Cover Drive trigger scheduler started (5 checks every 30 min)');