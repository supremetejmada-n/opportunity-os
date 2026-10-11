import { Router, Request, Response } from 'express';
import { productStoryEngine } from '../services/productStoryEngine.js';

export const storyRouter = Router();

// GET /api/story/current — Fetch the current active Product Story
storyRouter.get('/current', async (req: Request, res: Response) => {
  try {
    const story = await productStoryEngine.getCurrentStory();
    return res.json({
      success: true,
      story
    });
  } catch (error: any) {
    console.error('[Story Router] Error fetching current product story:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch product story' });
  }
});

// GET /api/story/history — Fetch version history of Product Story
storyRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const history = await productStoryEngine.getStoryHistory(limit);
    return res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error: any) {
    console.error('[Story Router] Error fetching story history:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch story history' });
  }
});
