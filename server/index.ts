import express from 'express';
import { initDatabase } from './db/sqlite.js';
import { seedInitialDataIfNeeded } from './db/seed.js';
import { profileRouter } from './routes/profile.js';
import { aiApiRouter } from './routes/ai.js';
import { discoveriesRouter } from './routes/discoveries.js';
import { scanRouter } from './routes/scan.js';
import { opportunitiesRouter } from './routes/opportunities.js';
import { combinerRouter } from './routes/combiner.js';
import { actionPlansRouter } from './routes/actionPlans.js';
import { progressRouter } from './routes/progress.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// CORS for dev if needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Mount routes
app.use('/api/profile', profileRouter);
app.use('/api/ai', aiApiRouter);
app.use('/api/discoveries', discoveriesRouter);
app.use('/api/scan', scanRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/combinations', combinerRouter);
app.use('/api/combiner', combinerRouter);
app.use('/api/action-plans', actionPlansRouter);
app.use('/api/progress', progressRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Personal AI Opportunity Engine V1 (Phase 6 Active)',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    await initDatabase();
    await seedInitialDataIfNeeded();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Personal AI Opportunity Engine Backend Running `);
      console.log(` Port: http://localhost:${PORT}`);
      console.log(` Health: http://localhost:${PORT}/api/health`);
      console.log(` Discoveries: http://localhost:${PORT}/api/discoveries`);
      console.log(` AI Status: http://localhost:${PORT}/api/ai/status`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
