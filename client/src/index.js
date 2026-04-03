const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check FIRST — before any other routes ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Cover Drive API', version: '1.0.0' });
});

// ── Load routes one by one safely ──
try {
  app.use('/api/auth',     require('./routes/auth'));
  console.log('✅ auth routes loaded');
} catch(e) { console.error('❌ auth routes failed:', e.message); }

try {
  app.use('/api/zones',    require('./routes/zones'));
  console.log('✅ zones routes loaded');
} catch(e) { console.error('❌ zones routes failed:', e.message); }

try {
  app.use('/api/policies', require('./routes/policies'));
  console.log('✅ policies routes loaded');
} catch(e) { console.error('❌ policies routes failed:', e.message); }

try {
  app.use('/api/claims',   require('./routes/claims'));
  console.log('✅ claims routes loaded');
} catch(e) { console.error('❌ claims routes failed:', e.message); }

try {
  app.use('/api/triggers', require('./routes/triggers'));
  console.log('✅ triggers routes loaded');
} catch(e) { console.error('❌ triggers routes failed:', e.message); }

try {
  app.use('/api/premium',  require('./routes/premium'));
  console.log('✅ premium routes loaded');
} catch(e) { console.error('❌ premium routes failed:', e.message); }

try {
  app.use('/api/claude',   require('./routes/claude'));
  console.log('✅ claude routes loaded');
} catch(e) { console.error('❌ claude routes failed:', e.message); }

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Cover Drive API running on port ${PORT}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL ? '✅ set' : '❌ MISSING'}`);
  console.log(`   JWT Secret:   ${process.env.JWT_SECRET   ? '✅ set' : '❌ MISSING'}`);

  // Start cron jobs
  try {
    require('./triggers/cronScheduler');
  } catch(e) {
    console.error('❌ Cron scheduler failed:', e.message);
  }
});