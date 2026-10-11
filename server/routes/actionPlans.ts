import { Router, Request, Response } from 'express';
import { actionPlanEngine } from '../services/actionPlanEngine.js';
import { ActionStepStatus } from '../../src/types/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';

export const actionPlansRouter = Router();

// Protect all action plan routes with authentication & active subscription/trial
actionPlansRouter.use(requireAuth);
actionPlansRouter.use(requireSubscription);

// POST /api/action-plans/generate
actionPlansRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { opportunityId, combinationId, cardPayload, cardData, card } = req.body;
    const payload = cardPayload || cardData || card;
    const userId = req.user!.userId;

    if (!opportunityId && !combinationId) {
      return res.status(400).json({ error: 'Either opportunityId or combinationId is required' });
    }

    let plan;
    if (opportunityId) {
      plan = await actionPlanEngine.generatePlanForOpportunity(opportunityId, payload, userId);
    } else if (combinationId) {
      plan = await actionPlanEngine.generatePlanForCombination(combinationId, payload, userId);
    }

    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error generating action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate action plan' });
  }
});

// GET /api/action-plans
actionPlansRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { opportunityId, combinationId, status } = req.query;
    const userId = req.user!.userId;
    const plans = await actionPlanEngine.getActionPlans({
      opportunityId: opportunityId as string | undefined,
      combinationId: combinationId as string | undefined,
      status: status as string | undefined
    }, userId);
    return res.json({ success: true, plans, count: plans.length });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error listing action plans:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch action plans' });
  }
});

// GET /api/action-plans/current
actionPlansRouter.get('/current', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const plan = await actionPlanEngine.getCurrentActivePlan(userId);
    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error fetching current action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch current action plan' });
  }
});

// GET /api/action-plans/:id
actionPlansRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const plan = await actionPlanEngine.getActionPlanById(id, userId);
    if (!plan) {
      return res.status(404).json({ error: 'Action plan not found' });
    }
    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error fetching action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch action plan' });
  }
});

// POST /api/action-plans/:id/start
actionPlansRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const plan = await actionPlanEngine.startPlan(id, userId);
    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error starting action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to start action plan' });
  }
});

// POST /api/action-plans/:id/pause
actionPlansRouter.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const plan = await actionPlanEngine.pausePlan(id, userId);
    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error pausing action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to pause action plan' });
  }
});

// POST /api/action-plans/:id/resume
actionPlansRouter.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const plan = await actionPlanEngine.resumePlan(id, userId);
    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error resuming action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to resume action plan' });
  }
});

// POST /api/action-plans/:id/complete
actionPlansRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const plan = await actionPlanEngine.completePlan(id, userId);
    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error completing action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to complete action plan' });
  }
});

// DELETE /api/action-plans/:id
actionPlansRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const deleted = await actionPlanEngine.deletePlan(id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Action plan not found or already deleted' });
    }
    return res.json({ success: true, message: 'Action plan deleted successfully' });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error deleting action plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete action plan' });
  }
});

// PATCH /api/action-plans/steps/:stepId
actionPlansRouter.patch('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user!.userId;

    const validStatuses: ActionStepStatus[] = ['not_started', 'in_progress', 'completed', 'skipped', 'blocked'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updatedStep = await actionPlanEngine.updateStep(stepId, { status, notes }, userId);
    return res.json({ success: true, step: updatedStep });
  } catch (err: any) {
    console.error('[ActionPlans Router] Error updating step:', err);
    return res.status(500).json({ error: err.message || 'Failed to update step' });
  }
});
