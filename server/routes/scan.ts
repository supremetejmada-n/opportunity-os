import { Router, Request, Response } from 'express';
import { scanEngine } from '../services/scanEngine.js';

export const scanRouter = Router();

// POST /api/scan/trigger — Execute real on-demand opportunity intelligence scan
scanRouter.post('/trigger', async (req: Request, res: Response) => {
  try {
    if (scanEngine.isScanning()) {
      return res.status(409).json({
        success: false,
        status: 'running',
        message: 'A scan is already in progress. Please wait for it to complete.'
      });
    }

    const result = await scanEngine.runOnDemandScan();

    return res.json({
      success: true,
      status: result.scanRecord.status,
      scanRecord: result.scanRecord,
      recommendations: result.recommendations,
      count: result.totalRecommended,
      message: `Scan complete: Discovered ${result.scanRecord.items_collected} items, verified ${result.scanRecord.verified_count} items, detected ${result.scanRecord.changed_count} changes, generated ${result.totalRecommended} top recommendations.`
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
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const history = await scanEngine.getScanHistory(limit);
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
    const record = await scanEngine.getLatestScanRecord();
    return res.json({
      success: true,
      scanRecord: record
    });
  } catch (error: any) {
    console.error('[Scan Router] Error fetching latest scan:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch latest scan' });
  }
});
