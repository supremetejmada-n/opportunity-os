import { Router, Request, Response } from 'express';
import { opportunityEngine } from '../services/opportunityEngine.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';

export const opportunitiesRouter = Router();

// Enforce authentication & active subscription/trial for opportunity operations
opportunitiesRouter.use(requireAuth);
opportunitiesRouter.use(requireSubscription);

// GET /api/opportunities — List evaluated and scored opportunities for authenticated user
opportunitiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { saved, minScore, difficulty, limit } = req.query;

    const opportunities = await opportunityEngine.getOpportunities({
      savedOnly: saved === 'true' || saved === '1',
      minScore: minScore ? Number(minScore) : undefined,
      difficulty: difficulty as string,
      limit: limit ? Number(limit) : 50
    }, userId);

    const bestOpportunity = opportunities.length > 0 ? opportunities[0] : null;
    const savedCount = opportunities.filter(o => o.saved).length;

    res.json({
      count: opportunities.length,
      savedCount,
      bestOpportunity,
      opportunities,
      message: opportunities.length === 0 ? 'No strong opportunities found from current evidence.' : undefined,
      worthKnowing: [
        '8-Factor transparent conservative scoring active (25% Skill, 20% Demand, 15% Tool, 15% Cost, 10% Time, 5% Learning, 5% Comp, 5% Simplicity).',
        'Market demand scored conservatively (unverified demand = neutral score).',
        'Earning ranges labeled as initial hypotheses requiring real market validation.'
      ]
    });
  } catch (error: any) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// GET /api/opportunities/latest-scan — Get best eligible opportunity from latest completed scan
opportunitiesRouter.get('/latest-scan', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await opportunityEngine.getBestOpportunityFromLatestCompletedScan(userId);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching latest scan opportunity:', error);
    res.status(500).json({ error: 'Failed to fetch latest scan opportunity' });
  }
});

// GET /api/opportunities/:id — Get details of a single opportunity
opportunitiesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const opportunity = await opportunityEngine.getOpportunityById(id, userId);

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(opportunity);
  } catch (error: any) {
    console.error('Error fetching opportunity detail:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity detail' });
  }
});

// POST /api/opportunities/evaluate — Trigger full re-evaluation scan
opportunitiesRouter.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const opportunities = await opportunityEngine.evaluateOpportunities(undefined, userId);
    res.json({
      success: true,
      message: `Evaluated ${opportunities.length} personalized earning opportunities.`,
      count: opportunities.length,
      topOpportunity: opportunities[0] || null,
      opportunities
    });
  } catch (error: any) {
    console.error('Error evaluating opportunities:', error);
    res.status(500).json({ error: 'Failed to evaluate opportunities' });
  }
});

// POST /api/opportunities/cleanup — Trigger explicit database duplicate cleanup
opportunitiesRouter.post('/cleanup', async (_req: Request, res: Response) => {
  try {
    const { cleanExistingDuplicates } = await import('../services/opportunityCleanup.js');
    const result = await cleanExistingDuplicates();
    res.json({
      success: true,
      message: 'Successfully deduplicated opportunity engine database.',
      result
    });
  } catch (error: any) {
    console.error('Error running duplicate cleanup:', error);
    res.status(500).json({ error: 'Failed to run duplicate cleanup' });
  }
});

// POST /api/opportunities/:id/save — Toggle saved state of an opportunity
opportunitiesRouter.post('/:id/save', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const updated = await opportunityEngine.toggleSaveOpportunity(id, userId);

    if (!updated) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json({
      success: true,
      saved: updated.saved,
      opportunity: updated
    });
  } catch (error: any) {
    console.error('Error toggling opportunity save state:', error);
    res.status(500).json({ error: 'Failed to save opportunity' });
  }
});
