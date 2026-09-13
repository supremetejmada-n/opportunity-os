import { Router, Request, Response } from 'express';
import { discoveryEngine } from '../services/discovery/discoveryEngine.js';

export const scanRouter = Router();

// POST /api/scan/trigger — Execute real discovery scan pipeline
scanRouter.post('/trigger', async (req: Request, res: Response) => {
  try {
    if (discoveryEngine.isScanning()) {
      return res.status(409).json({
        status: 'running',
        message: 'A scan is already in progress. Please wait for it to complete.'
      });
    }

    const summary = await discoveryEngine.runScan();

    res.json({
      status: 'completed',
      summary,
      message: `Scan complete: Discovered ${summary.discovered} items, deduplicated ${summary.duplicatesRemoved} items, stored ${summary.stored} new verified discoveries.`
    });
  } catch (error: any) {
    console.error('Scan execution error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message || 'Scan execution failed'
    });
  }
});
