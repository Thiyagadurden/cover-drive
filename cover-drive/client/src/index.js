const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// ── Middleware ──
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/zones',    require('./routes/zones'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/claims',   require('./routes/claims'));
app.use('/api/triggers', require('./routes/triggers'));
app.use('/api/premium',  require('./routes/premium'));

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Cover Drive API', version: '1.0.0' });
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Cover Drive API running on port ${PORT}`);

  // Start cron jobs
  require('./triggers/cronScheduler');
});