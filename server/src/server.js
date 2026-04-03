require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Routes ──
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/claims',   require('./routes/claims'));
app.use('/api/premium',  require('./routes/premium'));
app.use('/api/triggers', require('./routes/triggers'));
app.use('/api/zones',    require('./routes/zones'));

// ── Cron Scheduler ──
require('./triggers/cronScheduler.js');

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`🚀 CoverDrive API running on http://localhost:${PORT}`);
});
