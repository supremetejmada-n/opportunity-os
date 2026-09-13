import { SourceAdapter, DiscoverySourceType, RawDiscoveryItem } from './types.js';

export class RSSAdapter implements SourceAdapter {
  name = 'Web Feeds & RSS Adapter';
  sourceType: DiscoverySourceType = 'rss';

  isEnabled(): boolean {
    return true;
  }

  async collect(): Promise<RawDiscoveryItem[]> {
    const rawItems: RawDiscoveryItem[] = [];
    const now = new Date().toISOString();

    try {
      const hnUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(hnUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const storyIds = await response.json();
        const top15 = (Array.isArray(storyIds) ? storyIds.slice(0, 20) : []);

        for (const id of top15) {
          try {
            const itemUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
            const itemRes = await fetch(itemUrl);
            if (!itemRes.ok) continue;

            const story = await itemRes.json();
            if (!story || !story.title || !story.url) continue;

            const titleLower = story.title.toLowerCase();
            if (
              titleLower.includes('ai') || 
              titleLower.includes('llm') || 
              titleLower.includes('model') || 
              titleLower.includes('open source') || 
              titleLower.includes('tool') || 
              titleLower.includes('automation') ||
              titleLower.includes('code')
            ) {
              let canonicalResourceUrl: string | undefined = undefined;
              if (story.url.includes('github.com') || story.url.includes('huggingface.co')) {
                canonicalResourceUrl = story.url;
              }

              rawItems.push({
                source: 'rss',
                sourceId: `hn_${story.id}`,
                title: story.title,
                description: `Public web story: ${story.title}. Source article from ${story.by || 'web feed'}.`,
                url: story.url,
                canonicalResourceUrl,
                author: story.by || 'Hacker News Feed',
                licenseRaw: 'Unspecified',
                tagsRaw: ['web_feed', 'tech_news', 'market_signal'],
                rawMeta: { score: story.score, comments: story.descendants },
                retrievedAt: now
              });
            }
          } catch (e) {
            // Ignore single item fetch error
          }
        }
      }
    } catch (err: any) {
      console.warn(`[RSSAdapter] Collection failed: ${err.message}`);
    }

    return rawItems;
  }
}
