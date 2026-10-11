import { Router, Request, Response } from 'express';
import { discoveryEngine } from '../services/discovery/discoveryEngine.js';
import { getUserProfileContext } from '../services/discovery/relevanceGate.js';
import { optionalAuth } from '../middleware/auth.js';

export const discoveriesRouter = Router();

// GET /api/discoveries — List verified real-world discoveries
discoveriesRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { type, category, source, verificationStatus, pricingStatus, limit } = req.query;

    const profileContext = await getUserProfileContext(req.user?.userId);

    const discoveries = await discoveryEngine.getDiscoveries({
      type: type as string,
      category: category as string,
      source: source as string,
      verificationStatus: verificationStatus as string,
      pricingStatus: pricingStatus as string,
      limit: limit ? Number(limit) : 50
    }, profileContext);

    const summary = discoveryEngine.getLastScanSummary();

    const suggestions: string[] = [];
    if (profileContext.isIncompleteProfile) {
      suggestions.push('Add your current skills in Supreme Profile');
      suggestions.push('Add your active projects and target goals');
      suggestions.push('List tools you already use daily');
    } else if (discoveries.length === 0) {
      suggestions.push('Try expanding your saved interests or goal topics');
      suggestions.push('Add active project tech stack items to match new releases');
    }

    res.json({
      count: discoveries.length,
      discoveries,
      lastScanSummary: summary,
      isScanning: discoveryEngine.isScanning(),
      isIncompleteProfile: profileContext.isIncompleteProfile,
      emptyStateMessage: discoveries.length === 0 
        ? (profileContext.isIncompleteProfile 
            ? "Your profile is missing saved interests, goals, or skills. Complete your profile to receive personalized recommendations."
            : "No new tools currently meet your profile's relevance requirements. Your feed will update when a genuinely useful match is found.")
        : null,
      suggestions
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
