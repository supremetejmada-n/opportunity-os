import { Router, Request, Response } from 'express';
import { actionPlanEngine } from '../services/actionPlanEngine.js';
import { requireAuth } from '../middleware/auth.js';

export const progressRouter = Router();

// Protect all progress routes with authentication
progressRouter.use(requireAuth);

// GET /api/progress/metrics
progressRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const metrics = await actionPlanEngine.getProgressMetrics(userId);
    const activityLogs = await actionPlanEngine.getProgressLogs(undefined, userId);
    return res.json({ metrics, activityLogs });
  } catch (err: any) {
    console.error('[Progress Router] Error fetching metrics:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch progress metrics' });
  }
});

// GET /api/progress/logs
progressRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const { actionPlanId, opportunityId, combinationId } = req.query;
    const userId = req.user!.userId;
    const logs = await actionPlanEngine.getProgressLogs({
      actionPlanId: actionPlanId as string | undefined,
      opportunityId: opportunityId as string | undefined,
      combinationId: combinationId as string | undefined
    }, userId);
    return res.json({ success: true, logs, count: logs.length });
  } catch (err: any) {
    console.error('[Progress Router] Error fetching progress logs:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch progress logs' });
  }
});

// POST /api/progress/logs
progressRouter.post('/logs', async (req: Request, res: Response) => {
  try {
    const {
      actionPlanId,
      stepId,
      opportunityId,
      combinationId,
      resultType,
      outcome,
      numericValue,
      notes,
      evidenceLink,
      date
    } = req.body;
    const userId = req.user!.userId;

    if (!resultType) {
      return res.status(400).json({ error: 'resultType is required' });
    }

    const log = await actionPlanEngine.logProgressResult({
      actionPlanId,
      stepId,
      opportunityId,
      combinationId,
      resultType,
      outcome,
      numericValue: numericValue !== undefined ? Number(numericValue) : undefined,
      notes: notes || '',
      evidenceLink,
      date
    }, userId);

    return res.json({ success: true, log });
  } catch (err: any) {
    console.error('[Progress Router] Error creating progress log:', err);
    return res.status(500).json({ error: err.message || 'Failed to record progress log' });
  }
});

// DELETE /api/progress/logs/:id
progressRouter.delete('/logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const deleted = await actionPlanEngine.deleteProgressLog(id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Progress log not found or already deleted' });
    }
    return res.json({ success: true, message: 'Progress log deleted successfully' });
  } catch (err: any) {
    console.error('[Progress Router] Error deleting progress log:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete progress log' });
  }
});
