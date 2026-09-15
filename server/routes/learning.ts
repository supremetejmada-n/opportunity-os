import { Router, Request, Response } from 'express';
import { learningEngine } from '../services/learningEngine.js';

export const learningRouter = Router();

// POST /api/learning/rebuild — Manually trigger idempotent learning rebuild
learningRouter.post('/rebuild', async (req: Request, res: Response) => {
  try {
    const profile = await learningEngine.rebuildLearningProfile();
    return res.json({
      success: true,
      message: `Rebuilt learning profile cleanly from ${profile.total_signals} total signals.`,
      profile
    });
  } catch (err: any) {
    console.error('[Learning Router] Error rebuilding learning profile:', err);
    return res.status(500).json({ error: err.message || 'Failed to rebuild learning profile' });
  }
});

// GET /api/learning/profile — Get user learning profile
learningRouter.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await learningEngine.getLearningProfile();
    return res.json({ success: true, profile });
  } catch (err: any) {
    console.error('[Learning Router] Error fetching learning profile:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch learning profile' });
  }
});

// GET /api/learning/signals — Get learning signals
learningRouter.get('/signals', async (req: Request, res: Response) => {
  try {
    const { sourceType, limit } = req.query;
    const signals = await learningEngine.getLearningSignals({
      sourceType: sourceType as string | undefined,
      limit: limit ? Number(limit) : 50
    });
    return res.json({ success: true, signals, count: signals.length });
  } catch (err: any) {
    console.error('[Learning Router] Error fetching learning signals:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch learning signals' });
  }
});

// GET /api/learning/explanations/:id — Get explanation for opportunity or combination
learningRouter.get('/explanations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const oppExplanation = await learningEngine.calculateOpportunityAdjustment({ id, title: id });
    return res.json({
      success: true,
      explanation: {
        id,
        adjustment: oppExplanation.adjustment,
        explanationText: oppExplanation.explanation
      }
    });
  } catch (err: any) {
    console.error('[Learning Router] Error fetching explanation:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch explanation' });
  }
});
