import { SourceAdapter, RawDiscoveryItem, SourceStatusReport } from './types.js';
import { GitHubAdapter } from './githubAdapter.js';
import { HuggingFaceAdapter } from './huggingfaceAdapter.js';
import { RSSAdapter } from './rssAdapter.js';

export async function collectAllSources(): Promise<{
  rawItems: RawDiscoveryItem[];
  statusReports: SourceStatusReport[];
}> {
  const adapters: SourceAdapter[] = [
    new GitHubAdapter(),
    new HuggingFaceAdapter(),
    new RSSAdapter()
  ];

  const rawItems: RawDiscoveryItem[] = [];
  const statusReports: SourceStatusReport[] = [];

  for (const adapter of adapters) {
    const runTime = new Date().toISOString();
    if (!adapter.isEnabled()) {
      statusReports.push({
        source: adapter.sourceType,
        name: adapter.name,
        enabled: false,
        success: false,
        collectedCount: 0,
        details: 'Adapter disabled in configuration',
        lastRunAt: runTime
      } as any);
      continue;
    }

    try {
      console.log(`[Collector] Starting collection for adapter '${adapter.name}'...`);
      const items = await adapter.collect();
      rawItems.push(...items);

      statusReports.push({
        source: adapter.sourceType,
        name: adapter.name,
        enabled: true,
        success: true,
        collectedCount: items.length,
        lastRunAt: runTime
      });
      console.log(`[Collector] Adapter '${adapter.name}' collected ${items.length} items.`);
    } catch (err: any) {
      console.error(`[Collector] Adapter '${adapter.name}' threw unexpected error:`, err);
      statusReports.push({
        source: adapter.sourceType,
        name: adapter.name,
        enabled: true,
        success: false,
        collectedCount: 0,
        error: err.message || 'Collection error',
        lastRunAt: runTime
      });
    }
  }

  return {
    rawItems,
    statusReports
  };
}
