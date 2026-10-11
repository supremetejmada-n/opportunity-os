import { dbAll, dbGet, dbRun } from '../db/sqlite.js';

export type CanonicalServiceCategory =
  | 'SOCIAL_MEDIA_GRAPHICS'
  | 'SHORT_VIDEO_EDITING'
  | 'LEAD_AUTOMATION_TRIAGE'
  | 'LOCAL_DOCUMENT_INTELLIGENCE'
  | 'MARKET_LEAD_SCRAPING'
  | 'CUSTOMER_SUPPORT_BOT'
  | 'CONTENT_COPYWRITING'
  | 'AUDIO_TRANSCRIPTION'
  | 'DATA_EXTRACTION_SPREADSHEET'
  | 'DATABASE_SCHEMA_SETUP'
  | 'ALERT_BOT_MONITORING'
  | 'CUSTOM_AUTOMATION_SCRIPT'
  | 'GENERIC_SERVICE';

export type CanonicalCustomerArchetype =
  | 'LOCAL_BUSINESS'
  | 'CREATORS_PODCASTERS'
  | 'SERVICE_AGENCIES_REALESTATE'
  | 'B2B_COMMERCIAL'
  | 'ECOM_MERCHANTS'
  | 'GENERIC_CLIENT';

export interface OpportunityCandidateInput {
  id?: string;
  title: string;
  summary?: string;
  workflow?: string[];
  requiredTools?: string[];
  customerType?: string;
  targetCustomer?: string;
  workflowPattern?: string;
  serviceType?: string;
  deliverable?: string;
  customerProblem?: string;
  primaryOutcome?: string;
}

export interface SemanticFingerprint {
  audience: string;
  problem: string;
  outcome: string;
  deliverable: string;
  capability: string;
  fingerprintHash: string;
}

export function normalizeAudience(input: OpportunityCandidateInput): string {
  const combined = [
    input.targetCustomer || '',
    input.customerType || '',
    input.title || ''
  ].join(' ').toLowerCase();

  if (combined.includes('gym') || combined.includes('fitness')) return 'gyms';
  if (combined.includes('cafe') || combined.includes('café') || combined.includes('restaurant') || combined.includes('dining')) return 'cafes';
  if (combined.includes('clinic') || combined.includes('dental') || combined.includes('doctor') || combined.includes('health')) return 'clinics';
  if (combined.includes('seller') || combined.includes('shop') || combined.includes('store') || combined.includes('e-commerce') || combined.includes('retail')) return 'online_sellers';
  if (combined.includes('podcast') || combined.includes('creator') || combined.includes('video') || combined.includes('youtube')) return 'creators';
  if (combined.includes('real estate') || combined.includes('realtor') || combined.includes('property')) return 'real_estate';

  return 'local_businesses';
}

export function normalizeDeliverable(input: OpportunityCandidateInput): string {
  const combined = [
    input.deliverable || '',
    input.title || '',
    input.summary || ''
  ].join(' ').toLowerCase();

  if (combined.includes('reel') || combined.includes('video') || combined.includes('clip') || combined.includes('shorts')) return 'short_videos';
  if (combined.includes('poster') || combined.includes('graphic') || combined.includes('banner') || combined.includes('visual') || combined.includes('post') || combined.includes('social media') || combined.includes('content')) return 'graphic_posters';
  if (combined.includes('whatsapp') || combined.includes('reply template') || combined.includes('outreach')) return 'reply_templates';
  if (combined.includes('follow-up') || combined.includes('lead capture') || combined.includes('automation setup')) return 'lead_automation';
  if (combined.includes('spreadsheet') || combined.includes('excel') || combined.includes('data extraction')) return 'spreadsheet_data';
  if (combined.includes('transcription') || combined.includes('transcript') || combined.includes('audio clean')) return 'audio_transcript';
  if (combined.includes('document search') || combined.includes('pdf search') || combined.includes('private assistant')) return 'offline_doc_search';
  if (combined.includes('content calendar') || combined.includes('instagram content') || combined.includes('captions')) return 'social_content_calendar';

  return 'general_deliverable';
}

export function normalizeCapability(input: OpportunityCandidateInput): string {
  const combined = [
    input.title || '',
    input.summary || '',
    (input.workflow || []).join(' '),
    (input.requiredTools || []).join(' ')
  ].join(' ').toLowerCase();

  if (combined.includes('image') || combined.includes('canva') || combined.includes('poster') || combined.includes('post') || combined.includes('instagram') || combined.includes('graphic') || combined.includes('social')) return 'IMAGE_GRAPHICS';
  if (combined.includes('video') || combined.includes('capcut') || combined.includes('reel')) return 'VIDEO_EDITING';
  if (combined.includes('audio') || combined.includes('voice') || combined.includes('sound') || combined.includes('audacity')) return 'AUDIO_VOICE';
  if (combined.includes('lead') || combined.includes('n8n') || combined.includes('automation') || combined.includes('whatsapp')) return 'LEAD_AUTOMATION';
  if (combined.includes('spreadsheet') || combined.includes('sheet') || combined.includes('data')) return 'DATA_DOCUMENT';
  if (combined.includes('ollama') || combined.includes('local') || combined.includes('private')) return 'LOCAL_AI';

  return 'TEXT_COPYWRITING';
}

export function getSemanticFingerprint(input: OpportunityCandidateInput): SemanticFingerprint {
  const audience = normalizeAudience(input);
  const deliverable = normalizeDeliverable(input);
  const capability = normalizeCapability(input);
  const problem = (input.customerProblem || 'general_problem').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
  const outcome = (input.primaryOutcome || 'general_outcome').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);

  // Digest workflow into a stable signature so distinct workflows are preserved
  const workflowDigest = (input.workflow && Array.isArray(input.workflow) && input.workflow.length > 0)
    ? input.workflow.map(w => String(w).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)).join('_')
    : 'standard';

  const fingerprintHash = `${audience}::${capability}::${problem}::${deliverable}::${outcome}::${workflowDigest}`;

  return {
    audience,
    problem,
    outcome,
    deliverable,
    capability,
    fingerprintHash
  };
}

/**
 * Evaluates whether two candidates represent "Twin Services" (same audience, capability, problem, deliverable, and workflow).
 * Distinguishes distinct deliverables and workflows for the same audience.
 */
export function areTwinServices(
  a: OpportunityCandidateInput,
  b: OpportunityCandidateInput
): { isTwin: boolean; reason?: string } {
  const fpA = getSemanticFingerprint(a);
  const fpB = getSemanticFingerprint(b);

  if (fpA.fingerprintHash === fpB.fingerprintHash) {
    return {
      isTwin: true,
      reason: `Matching semantic fingerprint: ${fpA.fingerprintHash}`
    };
  }

  // Check normalized title equivalences ONLY if capabilities, problems, and deliverables match
  const normA = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = (b.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normA && normB && normA === normB) {
    if (fpA.capability === fpB.capability && fpA.deliverable === fpB.deliverable && fpA.problem === fpB.problem) {
      return {
        isTwin: true,
        reason: `Equivalent normalized title text ('${a.title}') and matching capability/deliverable/problem`
      };
    }
  }

  return { isTwin: false };
}

export function inferServiceCategory(input: OpportunityCandidateInput): CanonicalServiceCategory {
  const cap = normalizeCapability(input);
  switch (cap) {
    case 'IMAGE_GRAPHICS': return 'SOCIAL_MEDIA_GRAPHICS';
    case 'VIDEO_EDITING': return 'SHORT_VIDEO_EDITING';
    case 'AUDIO_VOICE': return 'AUDIO_TRANSCRIPTION';
    case 'LEAD_AUTOMATION': return 'LEAD_AUTOMATION_TRIAGE';
    case 'DATA_DOCUMENT': return 'DATA_EXTRACTION_SPREADSHEET';
    case 'LOCAL_AI': return 'LOCAL_DOCUMENT_INTELLIGENCE';
    case 'TEXT_COPYWRITING':
    default: return 'CONTENT_COPYWRITING';
  }
}

export function inferCustomerArchetype(input: OpportunityCandidateInput): CanonicalCustomerArchetype {
  const aud = normalizeAudience(input);
  switch (aud) {
    case 'gyms':
    case 'cafes': return 'LOCAL_BUSINESS';
    case 'creators': return 'CREATORS_PODCASTERS';
    case 'clinics':
    case 'real_estate': return 'SERVICE_AGENCIES_REALESTATE';
    case 'online_sellers': return 'ECOM_MERCHANTS';
    default: return 'GENERIC_CLIENT';
  }
}

export function getCanonicalOpportunityKey(input: OpportunityCandidateInput): string {
  const fp = getSemanticFingerprint(input);
  return `canonical::${fp.fingerprintHash}`;
}

export function areSemanticallyDuplicate(
  a: OpportunityCandidateInput,
  b: OpportunityCandidateInput
): { isDuplicate: boolean; reason?: string } {
  const twin = areTwinServices(a, b);
  return { isDuplicate: twin.isTwin, reason: twin.reason };
}

export function mergeOpportunityRecords(primary: any, secondary: any): any {
  const merged = { ...primary };

  merged.saved = Boolean(primary.saved || secondary.saved);

  if (Number(secondary.score || 0) > Number(primary.score || 0)) {
    merged.score = secondary.score;
    merged.scoreBreakdown = secondary.scoreBreakdown || secondary.score_breakdown || primary.scoreBreakdown;
  }

  const discIdsA = Array.isArray(primary.discoveryIds) ? primary.discoveryIds : (primary.discovery_id ? [primary.discovery_id] : []);
  const discIdsB = Array.isArray(secondary.discoveryIds) ? secondary.discoveryIds : (secondary.discovery_id ? [secondary.discovery_id] : []);
  merged.discoveryIds = Array.from(new Set([...discIdsA, ...discIdsB]));
  if (!merged.discoveryId && merged.discoveryIds.length > 0) {
    merged.discoveryId = merged.discoveryIds[0];
  }

  const toolIdsA = Array.isArray(primary.toolIds) ? primary.toolIds : (primary.tool_ids ? (typeof primary.tool_ids === 'string' ? JSON.parse(primary.tool_ids) : primary.tool_ids) : []);
  const toolIdsB = Array.isArray(secondary.toolIds) ? secondary.toolIds : (secondary.tool_ids ? (typeof secondary.tool_ids === 'string' ? JSON.parse(secondary.tool_ids) : secondary.tool_ids) : []);
  merged.toolIds = Array.from(new Set([...toolIdsA, ...toolIdsB]));

  if ((secondary.summary || '').length > (primary.summary || '').length) {
    merged.summary = secondary.summary;
  }

  if (['in_progress', 'completed', 'saved'].includes(secondary.status) && primary.status === 'new') {
    merged.status = secondary.status;
  }

  return merged;
}

/**
 * Safe, idempotent database reconciliation of duplicate & twin opportunity records in SQLite.
 * Preserves evidence, feedback, action plans, and progress logs.
 */
export async function reconcileDuplicateOpportunities(): Promise<{
  clustersFound: number;
  recordsMerged: number;
  remainingCount: number;
}> {
  const rows = await dbAll<any>('SELECT * FROM opportunities ORDER BY saved DESC, score DESC;');
  if (!rows || rows.length === 0) {
    return { clustersFound: 0, recordsMerged: 0, remainingCount: 0 };
  }

  const clusterMap = new Map<string, any[]>();

  for (const row of rows) {
    const key = getCanonicalOpportunityKey({
      id: row.id,
      title: row.title,
      summary: row.summary,
      customerType: row.customer_type,
      targetCustomer: row.target_customer,
      requiredTools: typeof row.required_tools === 'string' ? JSON.parse(row.required_tools || '[]') : row.required_tools
    });

    if (!clusterMap.has(key)) {
      clusterMap.set(key, []);
    }
    clusterMap.get(key)!.push(row);
  }

  let clustersFound = 0;
  let recordsMerged = 0;

  for (const [key, group] of clusterMap.entries()) {
    if (group.length <= 1) continue;

    clustersFound++;
    const primary = group[0];
    const secondaries = group.slice(1);

    for (const sec of secondaries) {
      // Repoint action plans referencing secondary opportunity
      await dbRun('UPDATE action_plans SET opportunity_id = ? WHERE opportunity_id = ?;', [primary.id, sec.id]);

      // Repoint progress logs referencing secondary opportunity
      await dbRun('UPDATE progress_logs SET opportunity_id = ? WHERE opportunity_id = ?;', [primary.id, sec.id]);

      // Repoint feedback records referencing secondary opportunity
      await dbRun('UPDATE feedback SET source_id = ? WHERE source_id = ? AND source_type = "opportunity";', [primary.id, sec.id]);

      // Safely remove secondary opportunity record
      await dbRun('DELETE FROM opportunities WHERE id = ?;', [sec.id]);
      recordsMerged++;
    }

    // Update primary canonical key
    await dbRun('UPDATE opportunities SET canonical_key = ? WHERE id = ?;', [key, primary.id]);
  }

  const countRow = await dbGet<{ cnt: number }>('SELECT COUNT(*) as cnt FROM opportunities;');
  const remainingCount = countRow ? countRow.cnt : 0;

  return {
    clustersFound,
    recordsMerged,
    remainingCount
  };
}
