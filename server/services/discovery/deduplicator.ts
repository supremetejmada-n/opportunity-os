import { NormalizedDiscovery } from './types.js';
import { dbAll } from '../../db/sqlite.js';

export async function deduplicateDiscoveries(
  candidates: NormalizedDiscovery[]
): Promise<{ uniqueItems: NormalizedDiscovery[]; duplicatesCount: number }> {
  let duplicatesCount = 0;
  const uniqueItems: NormalizedDiscovery[] = [];
  const seenKeys = new Set<string>();

  // Fetch existing URLs, source IDs, and titles from SQLite database
  const existingRows = await dbAll<{ id: string; url: string; source: string; source_id: string; title: string }>(
    'SELECT id, url, source, source_id, title FROM discoveries;'
  );

  const existingKeys = new Set<string>();
  existingRows.forEach(row => {
    if (row.url) {
      existingKeys.add(`url:${row.url.trim().toLowerCase().replace(/\/$/, '')}`);
    }
    if (row.source && row.source_id) {
      existingKeys.add(`src:${row.source}:${row.source_id}`);
    }
    if (row.title) {
      existingKeys.add(`title:${row.title.trim().toLowerCase()}`);
    }
  });

  for (const item of candidates) {
    const cleanUrl = (item.url || '').trim().toLowerCase().replace(/\/$/, '');
    const cleanCanonical = (item.canonicalResourceUrl || '').trim().toLowerCase().replace(/\/$/, '');
    const cleanTitle = (item.title || '').trim().toLowerCase();

    const urlKey = cleanUrl ? `url:${cleanUrl}` : '';
    const canonicalKey = cleanCanonical ? `url:${cleanCanonical}` : '';
    const srcKey = `src:${item.source}:${item.sourceId}`;
    const titleKey = cleanTitle ? `title:${cleanTitle}` : '';

    const isDuplicate =
      (urlKey !== '' && (existingKeys.has(urlKey) || seenKeys.has(urlKey))) ||
      (canonicalKey !== '' && (existingKeys.has(canonicalKey) || seenKeys.has(canonicalKey))) ||
      (srcKey !== '' && (existingKeys.has(srcKey) || seenKeys.has(srcKey))) ||
      (titleKey !== '' && (existingKeys.has(titleKey) || seenKeys.has(titleKey)));

    if (isDuplicate) {
      duplicatesCount++;
      continue;
    }

    if (urlKey) seenKeys.add(urlKey);
    if (canonicalKey) seenKeys.add(canonicalKey);
    if (srcKey) seenKeys.add(srcKey);
    if (titleKey) seenKeys.add(titleKey);
    uniqueItems.push(item);
  }

  return {
    uniqueItems,
    duplicatesCount
  };
}
