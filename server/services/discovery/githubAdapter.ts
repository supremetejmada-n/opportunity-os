import { SourceAdapter, DiscoverySourceType, RawDiscoveryItem } from './types.js';

export function calculateGitHubRelevance(item: {
  title: string;
  description: string;
  topics: string[];
  stars?: number;
}): number {
  let score = 0.5; // Base score
  const text = `${item.title} ${item.description} ${item.topics.join(' ')}`.toLowerCase();

  // Noise keywords to reject/penalize
  const noiseKeywords = [
    'portfolio', 'my-portfolio', 'student-project', 'homework', 'coursework',
    'my first', 'learning-git', 'html-css', 'college-project', 'assignment',
    'interview-prep', 'leetcode', 'flutter-app-demo', 'todo-list'
  ];

  for (const noise of noiseKeywords) {
    if (text.includes(noise)) {
      score -= 0.4;
    }
  }

  // Strong AI & Automation keywords to boost
  const aiKeywords = [
    'ai', 'agent', 'llm', 'automation', 'workflow', 'local-ai', 'vision',
    'generative', 'rag', 'vector', 'model', 'copilot', 'assistant', 'prompt',
    'n8n', 'browser-automation', 'mcp', 'transformer', 'fine-tuning'
  ];

  let matches = 0;
  for (const kw of aiKeywords) {
    if (text.includes(kw)) matches++;
  }

  score += Math.min(matches * 0.1, 0.4);

  // Bonus for activity/stars if available
  if (item.stars && item.stars > 5) score += 0.1;
  if (item.stars && item.stars > 50) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

export class GitHubAdapter implements SourceAdapter {
  name = 'GitHub Repository Search Adapter';
  sourceType: DiscoverySourceType = 'github';

  isEnabled(): boolean {
    return true;
  }

  async collect(): Promise<RawDiscoveryItem[]> {
    const rawItems: RawDiscoveryItem[] = [];
    const now = new Date().toISOString();

    // Targeted search queries for relevant AI, Local AI, Agent, and Automation repos
    const searchQueries = [
      'topic:ai-agent+stars:>5',
      'topic:local-ai+stars:>5',
      'topic:workflow-automation+stars:>5',
      'topic:llm-tooling+stars:>5',
      'topic:ai-tools+stars:>5'
    ];

    for (const query of searchQueries) {
      try {
        const url = `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=6`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'OpportunityEngine-DiscoveryAdapter/1.0',
            'Accept': 'application/vnd.github.v3+json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[GitHubAdapter] HTTP ${response.status} for query '${query}'`);
          continue;
        }

        const data = await response.json();
        const items = data.items || [];

        for (const item of items) {
          const topics = item.topics || [];
          const relScore = calculateGitHubRelevance({
            title: item.name || '',
            description: item.description || '',
            topics,
            stars: item.stargazers_count
          });

          // Reject noise below relevance threshold
          if (relScore < 0.35) {
            console.log(`[GitHubAdapter] Filtered low relevance repo: ${item.full_name} (score: ${relScore.toFixed(2)})`);
            continue;
          }

          rawItems.push({
            source: 'github',
            sourceId: item.full_name || String(item.id),
            title: item.name || 'Untitled GitHub Repo',
            description: item.description || '',
            url: item.html_url || `https://github.com/${item.full_name}`,
            author: item.owner?.login || 'unknown',
            licenseRaw: item.license?.spdx_id || item.license?.name || 'Unspecified',
            tagsRaw: topics,
            rawMeta: {
              stars: item.stargazers_count,
              forks: item.forks_count,
              updatedAt: item.updated_at,
              relevanceScore: relScore
            },
            retrievedAt: now
          });
        }
      } catch (err: any) {
        console.warn(`[GitHubAdapter] Query '${query}' failed: ${err.message}`);
      }
    }

    return rawItems;
  }
}
