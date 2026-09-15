import { Router, Request, Response } from 'express';
import { learningEngine } from '../services/learningEngine.js';
import { dbGet } from '../db/sqlite.js';

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

// GET /api/learning/explanations/:id — Get type-aware explanation for opportunity or combination
learningRouter.get('/explanations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sourceType = (req.query.sourceType || req.query.source_type || '') as string;

    let itemType: 'opportunity' | 'combination' | null = null;
    let itemRecord: any = null;

    if (sourceType === 'opportunity') {
      itemRecord = await dbGet<any>('SELECT * FROM opportunities WHERE id = ?', [id]);
      if (itemRecord) itemType = 'opportunity';
    } else if (sourceType === 'combination') {
      itemRecord = await dbGet<any>('SELECT * FROM tool_combinations WHERE id = ?', [id]);
      if (itemRecord) itemType = 'combination';
    } else {
      // Auto-detect: check opportunities first, then tool_combinations
      itemRecord = await dbGet<any>('SELECT * FROM opportunities WHERE id = ?', [id]);
      if (itemRecord) {
        itemType = 'opportunity';
      } else {
        itemRecord = await dbGet<any>('SELECT * FROM tool_combinations WHERE id = ?', [id]);
        if (itemRecord) {
          itemType = 'combination';
        }
      }
    }

    if (!itemType || !itemRecord) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in opportunities or tool_combinations table'
      });
    }

    const profile = await learningEngine.getLearningProfile();
    const confidenceRating = profile.confidence_score >= 0.7 ? 'High' : profile.confidence_score >= 0.4 ? 'Medium' : profile.total_signals > 0 ? 'Low' : 'Neutral';

    let adjustment = 0;
    let explanationText = '';

    if (itemType === 'opportunity') {
      let tools: string[] = [];
      try {
        tools = typeof itemRecord.required_tools === 'string' ? JSON.parse(itemRecord.required_tools) : (itemRecord.required_tools || []);
      } catch {
        tools = [];
      }
      const resAdj = await learningEngine.calculateOpportunityAdjustment({
        id: itemRecord.id,
        title: itemRecord.title,
        customerType: itemRecord.customer_type,
        requiredTools: tools
      });
      adjustment = resAdj.adjustment;
      explanationText = resAdj.explanation;
    } else {
      let tools: string[] = [];
      try {
        tools = typeof itemRecord.tool_names === 'string' ? JSON.parse(itemRecord.tool_names) : (itemRecord.tool_names || []);
      } catch {
        tools = [];
      }
      const resAdj = await learningEngine.calculateCombinationAdjustment({
        id: itemRecord.id,
        title: itemRecord.title,
        workflowPattern: itemRecord.workflow_pattern,
        toolNames: tools
      });
      adjustment = resAdj.adjustment;
      explanationText = resAdj.explanation;
    }

    return res.json({
      success: true,
      sourceType: itemType,
      sourceId: id,
      adjustment,
      explanationText,
      confidence: confidenceRating,
      explanation: {
        id,
        sourceType: itemType,
        sourceId: id,
        adjustment,
        explanationText,
        confidence: confidenceRating
      }
    });
  } catch (err: any) {
    console.error('[Learning Router] Error fetching explanation:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch explanation' });
  }
});
