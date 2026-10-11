import { Router, Request, Response } from 'express';
import { learningEngine } from '../services/learningEngine.js';
import { FeedbackRating } from '../../src/types/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';

export const feedbackRouter = Router();

// Protect all feedback routes with authentication & active subscription/trial
feedbackRouter.use(requireAuth);
feedbackRouter.use(requireSubscription);

// POST /api/feedback — Submit feedback on an Opportunity or Combination
feedbackRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sourceType, sourceId, rating, reason, comments } = req.body;
    const userId = req.user!.userId;

    if (!sourceType || !sourceId || !rating) {
      return res.status(400).json({ error: 'sourceType, sourceId, and rating are required' });
    }

    const validRatings: FeedbackRating[] = ['useful', 'not_useful', 'tried', 'ignore', 'save', 'not_relevant', 'already_know'];
    if (!validRatings.includes(rating)) {
      return res.status(400).json({ error: `Invalid rating. Must be one of: ${validRatings.join(', ')}` });
    }

    const feedback = await learningEngine.recordFeedback({
      sourceType: sourceType === 'combination' ? 'combination' : 'opportunity',
      sourceId,
      rating,
      reason,
      comments
    }, userId);

    return res.json({ success: true, feedback });
  } catch (err: any) {
    console.error('[Feedback Router] Error submitting feedback:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit feedback' });
  }
});

// GET /api/feedback — List all submitted feedback
feedbackRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { sourceType, sourceId } = req.query;
    const userId = req.user!.userId;
    const feedbackList = await learningEngine.getFeedback({
      sourceType: sourceType as string | undefined,
      sourceId: sourceId as string | undefined
    }, userId);
    return res.json({ success: true, feedback: feedbackList, count: feedbackList.length });
  } catch (err: any) {
    console.error('[Feedback Router] Error fetching feedback:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch feedback' });
  }
});
