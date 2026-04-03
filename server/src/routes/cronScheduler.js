const cron = require('node-cron');

console.log('⏰ Trigger scheduler initialized (Chapter 4 will add the 5 triggers)');

// Runs every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log(`[Cron] ${new Date().toISOString()} — Running disruption checks...`);
});