import { NormalizedDiscovery } from './types.js';
import { dbAll } from '../../db/sqlite.js';

export async function deduplicateDiscoveries(
  candidates: NormalizedDiscovery[]
): Promise<{ uniqueItems: NormalizedDiscovery[]; duplicatesCount: number }> {
  let duplicatesCount = 0;
  const uniqueItems: NormalizedDiscovery[] = [];
  const seenKeys = new Set<string>();

  // Fetch existing URLs and source IDs from SQLite database
  const existingRows = await dbAll<{ url: string; source: string; source_id: string }>(
    'SELECT url, source, source_id FROM discoveries;'
  );

  const existingKeys = new Set<string>();
  existingRows.forEach(row => {
    if (row.url) existingKeys.add(`url:${row.url}`);
    if (row.source && row.source_id) existingKeys.add(`src:${row.source}:${row.source_id}`);
  });

  for (const item of candidates) {
    const urlKey = `url:${item.url}`;
    const srcKey = `src:${item.source}:${item.sourceId}`;

    if (existingKeys.has(urlKey) || existingKeys.has(srcKey) || seenKeys.has(urlKey) || seenKeys.has(srcKey)) {
      duplicatesCount++;
      continue;
    }

    seenKeys.add(urlKey);
    seenKeys.add(srcKey);
    uniqueItems.push(item);
  }

  return {
    uniqueItems,
    duplicatesCount
  };
}
