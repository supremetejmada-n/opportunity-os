import { Router, Request, Response } from 'express';
import {
  generateAndStoreCombinations,
  getStoredCombinations,
  getStoredCombinationById,
  toggleSaveCombination
} from '../services/combineEngine.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';

export const combinerRouter = Router();

// Enforce authentication & active subscription/trial for all combination operations
combinerRouter.use(requireAuth);
combinerRouter.use(requireSubscription);

// GET / - List combinations for authenticated user
combinerRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const savedOnly = req.query.saved === 'true';
    const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    let combinations = await getStoredCombinations({ savedOnly, minScore, limit }, userId);

    // If no combinations exist yet and not filtering strictly by saved, auto-generate initial batch for this user
    if (combinations.length === 0 && !savedOnly) {
      combinations = await generateAndStoreCombinations({ minScore }, userId);
    }

    const savedCount = combinations.filter(c => c.saved).length;

    res.json({
      count: combinations.length,
      savedCount,
      combinations,
      message: combinations.length === 0
        ? 'No strong tool combinations met the quality threshold (65/100). Consider adding complementary tools like design, automation, or text processing to unlock synergistic workflows.'
        : `Successfully evaluated ${combinations.length} high-synergy tool combinations.`
    });
  } catch (error: any) {
    console.error('Error fetching combinations:', error);
    res.status(500).json({ error: 'Failed to fetch combinations', details: error?.message });
  }
});

// GET /:id - Get combination by ID for authenticated user
combinerRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const combination = await getStoredCombinationById(req.params.id, userId);
    if (!combination) {
      return res.status(404).json({ error: 'Combination not found' });
    }
    res.json(combination);
  } catch (error: any) {
    console.error('Error fetching combination:', error);
    res.status(500).json({ error: 'Failed to fetch combination detail', details: error?.message });
  }
});

// POST /generate - Generate combinations for authenticated user
combinerRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { toolIds, minScore } = req.body || {};

    let cleanToolIds: string[] | undefined = undefined;
    if (toolIds !== undefined) {
      if (!Array.isArray(toolIds)) {
        return res.status(400).json({
          error: 'toolIds must be an array of tool IDs.',
          combinations: []
        });
      }
      cleanToolIds = Array.from(new Set(toolIds.map(t => String(t).trim()).filter(Boolean)));
      if (cleanToolIds.length === 0) {
        return res.status(400).json({
          error: 'Please select at least 1 valid tool to generate opportunities.',
          combinations: []
        });
      }
      if (cleanToolIds.length > 50) {
        return res.status(400).json({
          error: 'Maximum 50 tools can be evaluated in a single request for performance.',
          combinations: []
        });
      }
    }

    const combinations = await generateAndStoreCombinations({
      toolIds: cleanToolIds,
      minScore
    }, userId);

    res.json({
      success: true,
      count: combinations.length,
      combinations,
      message: combinations.length === 0
        ? 'No tool combinations or standalone services reached the quality threshold (65/100). Try selecting tools with complementary roles or verified standalone capabilities.'
        : `Generated ${combinations.length} practical tool services and combinations.`
    });
  } catch (error: any) {
    console.error('Error generating combinations:', error);
    res.status(500).json({ error: 'Failed to generate combinations', details: error?.message });
  }
});

// POST /:id/save - Toggle save status for authenticated user
combinerRouter.post('/:id/save', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await toggleSaveCombination(req.params.id, userId);
    if (!result.success) {
      return res.status(404).json({ error: 'Combination not found' });
    }
    res.json(result);
  } catch (error: any) {
    console.error('Error toggling combination save:', error);
    res.status(500).json({ error: 'Failed to toggle save state', details: error?.message });
  }
});
