import express from 'express';
import { initDatabase } from './db/sqlite.js';
import { seedInitialDataIfNeeded } from './db/seed.js';
import { cleanExistingDuplicates } from './services/opportunityCleanup.js';
import { profileRouter } from './routes/profile.js';
import { aiApiRouter } from './routes/ai.js';
import { discoveriesRouter } from './routes/discoveries.js';
import { scanRouter } from './routes/scan.js';
import { opportunitiesRouter } from './routes/opportunities.js';
import { combinerRouter } from './routes/combiner.js';
import { actionPlansRouter } from './routes/actionPlans.js';
import { progressRouter } from './routes/progress.js';
import { feedbackRouter } from './routes/feedback.js';
import { learningRouter } from './routes/learning.js';
import { storyRouter } from './routes/story.js';
import { authRouter } from './routes/auth.js';
import { subscriptionRouter } from './routes/subscription.js';

import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Multi-origin CORS handling
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin as string;
  if (allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  } else if (!requestOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
  }

  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/profile', profileRouter);
app.use('/api/ai', aiApiRouter);
app.use('/api/discoveries', discoveriesRouter);
app.use('/api/scan', scanRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/combinations', combinerRouter);
app.use('/api/combiner', combinerRouter);
app.use('/api/action-plans', actionPlansRouter);
app.use('/api/progress', progressRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/learning', learningRouter);
app.use('/api/story', storyRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Personal AI Opportunity Engine V1 (Phase 7 Active)',
    timestamp: new Date().toISOString()
  });
});

// Production Static Asset Serving & SPA Routing Fallback
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function startServer() {
  try {
    await initDatabase();
    await seedInitialDataIfNeeded();
    await cleanExistingDuplicates();

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
