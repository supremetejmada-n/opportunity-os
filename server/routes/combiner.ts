import { Router, Request, Response } from 'express';
import {
  generateAndStoreCombinations,
  getStoredCombinations,
  getStoredCombinationById,
  toggleSaveCombination
} from '../services/combineEngine.js';

export const combinerRouter = Router();

// GET / - List combinations
combinerRouter.get('/', async (req: Request, res: Response) => {
  try {
    const savedOnly = req.query.saved === 'true';
    const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    let combinations = await getStoredCombinations({ savedOnly, minScore, limit });

    // If no combinations exist yet and not filtering strictly by saved, auto-generate initial batch
    if (combinations.length === 0 && !savedOnly) {
      combinations = await generateAndStoreCombinations({ minScore });
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

// GET /:id - Get combination by ID
combinerRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const combination = await getStoredCombinationById(req.params.id);
    if (!combination) {
      return res.status(404).json({ error: 'Combination not found' });
    }
    res.json(combination);
  } catch (error: any) {
    console.error('Error fetching combination:', error);
    res.status(500).json({ error: 'Failed to fetch combination detail', details: error?.message });
  }
});

// POST /generate - Generate combinations
combinerRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { toolIds, minScore } = req.body || {};

    if (toolIds && Array.isArray(toolIds) && toolIds.length === 1) {
      return res.status(400).json({
        error: 'Tool combinations require at least 2 tools. Please select 2 to 4 tools to evaluate synergies.',
        combinations: []
      });
    }

    const combinations = await generateAndStoreCombinations({
      toolIds,
      minScore
    });

    res.json({
      success: true,
      count: combinations.length,
      combinations,
      message: combinations.length === 0
        ? 'No tool combinations reached the minimum quality threshold (65/100). Try selecting tools with complementary roles (e.g. content generation + visual design, or scraping + AI analysis).'
        : `Generated ${combinations.length} synergistic tool combinations.`
    });
  } catch (error: any) {
    console.error('Error generating combinations:', error);
    res.status(500).json({ error: 'Failed to generate combinations', details: error?.message });
  }
});

// POST /:id/save - Toggle save status
combinerRouter.post('/:id/save', async (req: Request, res: Response) => {
  try {
    const result = await toggleSaveCombination(req.params.id);
    if (!result.success) {
      return res.status(404).json({ error: 'Combination not found' });
    }
    res.json(result);
  } catch (error: any) {
    console.error('Error toggling combination save:', error);
    res.status(500).json({ error: 'Failed to toggle save state', details: error?.message });
  }
});
