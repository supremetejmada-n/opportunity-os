import { Router, Request, Response } from 'express';
import { scanEngine } from '../services/scanEngine.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';

export const scanRouter = Router();

// Protect all scan routes with authentication & active subscription/trial
scanRouter.use(requireAuth);
scanRouter.use(requireSubscription);

// POST /api/scan/trigger — Execute real on-demand opportunity intelligence scan
scanRouter.post('/trigger', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    if (scanEngine.isScanning()) {
      return res.status(409).json({
        success: false,
        status: 'running',
        message: 'A scan is already in progress. Please wait for it to complete.'
      });
    }

    const result = await scanEngine.runOnDemandScan(userId);
    const status = result.scanRecord.status;
    let message = '';

    if (status === 'partial') {
      message = `Scan completed with partial results: Discovered ${result.scanRecord.items_collected} items (${result.scanRecord.verified_count} verified), but some adapters encountered errors. Generated ${result.totalRecommended} top recommendations.`;
    } else if (status === 'failed') {
      message = `Scan failed: No items collected across attempted sources. Existing discoveries remain preserved.`;
    } else {
      message = `Scan complete: Discovered ${result.scanRecord.items_collected} items, verified ${result.scanRecord.verified_count} items, detected ${result.scanRecord.changed_count} changes, generated ${result.totalRecommended} top recommendations.`;
    }

    return res.json({
      success: status !== 'failed',
      status,
      scanRecord: result.scanRecord,
      recommendations: result.recommendations,
      count: result.totalRecommended,
      message
    });
  } catch (error: any) {
    console.error('[Scan Router] Scan execution error:', error);
    return res.status(500).json({
      success: false,
      status: 'failed',
      error: error.message || 'Scan execution failed'
    });
  }
});

// GET /api/scan/history — Get historical scan executions
scanRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const history = await scanEngine.getScanHistory(limit, userId);
    return res.json({
      success: true,
      scanRecords: history,
      count: history.length
    });
  } catch (error: any) {
    console.error('[Scan Router] Error fetching scan history:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch scan history' });
  }
});

// GET /api/scan/latest — Get latest scan execution record
scanRouter.get('/latest', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const record = await scanEngine.getLatestScanRecord(userId);
    return res.json({
      success: true,
      scanRecord: record
    });
  } catch (error: any) {
    console.error('[Scan Router] Error fetching latest scan:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch latest scan' });
  }
});
