import { NormalizedDiscovery, DiscoveryType } from './types.js';
import { aiRouter } from '../aiRouter.js';
import { PROMPT_TEMPLATES } from '../ai/promptTemplates.js';

export async function classifyDiscovery(item: NormalizedDiscovery): Promise<NormalizedDiscovery> {
  let type: DiscoveryType = 'other';
  let category = 'AI & Tech';

  const text = `${item.title} ${item.description} ${item.capabilities.join(' ')}`.toLowerCase();

  // RSS / Web news items MUST be classified as market_signal or capability unless pointing directly to a canonical code repo / model
  if (item.source === 'rss' || item.source === 'web') {
    if (item.canonicalResourceUrl && item.canonicalResourceUrl.includes('github.com')) {
      type = 'open_source_project';
      category = 'Open Source Codebase';
    } else if (item.canonicalResourceUrl && item.canonicalResourceUrl.includes('huggingface.co')) {
      type = 'ai_model';
      category = 'Machine Learning & Models';
    } else if (text.includes('capability') || text.includes('benchmark') || text.includes('paper') || text.includes('research')) {
      type = 'capability';
      category = 'AI Capabilities & Research';
    } else {
      type = 'market_signal';
      category = 'Market Signals & Trends';
    }

    return {
      ...item,
      type,
      category
    };
  }

  // For GitHub & Hugging Face items, try AI Router classification if available
  try {
    const prompt = PROMPT_TEMPLATES.discoveryClassification({
      title: item.title,
      description: item.description,
      source: item.source,
      license: item.license
    });

    const aiRes = await aiRouter.processStructuredTask<{ category?: string; pricingStatus?: string }>({
      taskType: 'classify',
      input: prompt,
      outputFormat: 'json',
      timeoutMs: 5000
    });

    if (aiRes.success && aiRes.structuredData?.category) {
      const cat = aiRes.structuredData.category.toLowerCase();
      if (cat.includes('model') && item.source === 'huggingface') type = 'ai_model';
      else if (cat.includes('automation')) type = 'automation_tool';
      else if (cat.includes('api')) type = 'api';
      else if ((cat.includes('repo') || cat.includes('open source')) && item.source === 'github') type = 'open_source_project';
      else if (cat.includes('tool')) type = 'ai_tool';
    }
  } catch (err) {
    // Silent fallback to deterministic rules
  }

  // Deterministic Rule-Based Fallback
  if (type === 'other') {
    if (item.source === 'huggingface') {
      type = 'ai_model';
      category = 'Machine Learning & Models';
    } else if (item.source === 'github') {
      if (text.includes('n8n') || text.includes('workflow') || text.includes('automation')) {
        type = 'automation_tool';
        category = 'Workflow Automation';
      } else if (text.includes('api') || text.includes('sdk') || text.includes('endpoint')) {
        type = 'api';
        category = 'Developer APIs';
      } else if (text.includes('tool') || text.includes('cli') || text.includes('ui') || text.includes('agent')) {
        type = 'ai_tool';
        category = 'AI Tools & Agents';
      } else {
        type = 'open_source_project';
        category = 'Open Source Codebase';
      }
    } else {
      type = 'developer_tool';
      category = 'Developer Utilities';
    }
  }

  return {
    ...item,
    type,
    category
  };
}
