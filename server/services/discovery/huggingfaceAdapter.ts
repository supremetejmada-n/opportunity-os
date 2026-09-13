import { SourceAdapter, DiscoverySourceType, RawDiscoveryItem } from './types.js';

export class HuggingFaceAdapter implements SourceAdapter {
  name = 'Hugging Face Models Adapter';
  sourceType: DiscoverySourceType = 'huggingface';

  isEnabled(): boolean {
    return true;
  }

  async collect(): Promise<RawDiscoveryItem[]> {
    const rawItems: RawDiscoveryItem[] = [];
    const now = new Date().toISOString();

    try {
      const url = 'https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=15';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpportunityEngine-DiscoveryAdapter/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HuggingFace API HTTP ${response.status}: ${response.statusText}`);
      }

      const models = await response.json();

      if (Array.isArray(models)) {
        for (const m of models) {
          const modelId = m.id || m.modelId;
          if (!modelId) continue;

          const tags = Array.isArray(m.tags) ? m.tags : [];
          const licenseTag = tags.find((t: string) => t.startsWith('license:'));
          let licenseRaw = licenseTag ? licenseTag.replace('license:', '').trim() : 'Unspecified';
          
          if (licenseRaw === 'other' || licenseRaw === 'unknown' || !licenseRaw) {
            licenseRaw = 'Unspecified';
          }

          const pipelineTag = m.pipeline_tag || tags.find((t: string) => !t.includes(':')) || 'AI Model';
          const author = modelId.includes('/') ? modelId.split('/')[0] : 'huggingface';

          const description = `Hugging Face model repository (${pipelineTag}). Last modified: ${m.lastModified ? String(m.lastModified).slice(0, 10) : 'recent'}. Tags: ${tags.slice(0, 4).join(', ')}`;

          rawItems.push({
            source: 'huggingface',
            sourceId: modelId,
            title: modelId,
            description,
            url: `https://huggingface.co/${modelId}`,
            author,
            licenseRaw,
            tagsRaw: tags,
            rawMeta: {
              downloads: m.downloads || 0,
              likes: m.likes || 0,
              pipelineTag,
              lastModified: m.lastModified,
              private: Boolean(m.private),
              gated: Boolean(m.gated)
            },
            retrievedAt: now
          });
        }
      }
    } catch (err: any) {
      console.warn(`[HuggingFaceAdapter] Collection failed: ${err.message}`);
    }

    return rawItems;
  }
}
