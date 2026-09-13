import { Router, Request, Response } from 'express';
import { discoveryEngine } from '../services/discovery/discoveryEngine.js';

export const discoveriesRouter = Router();

// GET /api/discoveries — List verified real-world discoveries
discoveriesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { type, category, source, verificationStatus, pricingStatus, limit } = req.query;

    const discoveries = await discoveryEngine.getDiscoveries({
      type: type as string,
      category: category as string,
      source: source as string,
      verificationStatus: verificationStatus as string,
      pricingStatus: pricingStatus as string,
      limit: limit ? Number(limit) : 50
    });

    const summary = discoveryEngine.getLastScanSummary();

    res.json({
      count: discoveries.length,
      discoveries,
      lastScanSummary: summary,
      isScanning: discoveryEngine.isScanning()
    });
  } catch (error: any) {
    console.error('Error fetching discoveries:', error);
    res.status(500).json({ error: 'Failed to fetch discoveries' });
  }
});

// GET /api/discoveries/:id — Get discovery details & verification evidence
discoveriesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const discovery = await discoveryEngine.getDiscoveryById(id);

    if (!discovery) {
      return res.status(404).json({ error: 'Discovery item not found' });
    }

    res.json(discovery);
  } catch (error: any) {
    console.error('Error fetching discovery details:', error);
    res.status(500).json({ error: 'Failed to fetch discovery details' });
  }
});
