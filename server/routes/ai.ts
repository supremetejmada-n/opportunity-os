import { Router, Request, Response } from 'express';
import { aiRouter } from '../services/aiRouter.js';
import { AIRequest } from '../services/ai/types.js';

export const aiApiRouter = Router();

// GET /api/ai/status — Provider availability diagnostics
aiApiRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await aiRouter.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Error fetching AI status:', error);
    res.status(500).json({ error: 'Failed to retrieve AI provider status' });
  }
});

// POST /api/ai/test — Development-only route to test AI Router task processing
aiApiRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { taskType, input, context, preferredMode, outputFormat } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: "Missing or invalid 'input' parameter in request body." });
    }

    const aiReq: AIRequest = {
      taskType: taskType || 'summarize',
      input,
      context,
      preferredMode: preferredMode || 'auto',
      outputFormat: outputFormat || 'text'
    };

    let result;
    if (outputFormat === 'json') {
      result = await aiRouter.processStructuredTask(aiReq);
    } else {
      result = await aiRouter.processTask(aiReq);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in AI test endpoint:', error);
    res.status(500).json({
      success: false,
      provider: 'rule-based',
      error: error.message || 'AI request failed'
    });
  }
});
