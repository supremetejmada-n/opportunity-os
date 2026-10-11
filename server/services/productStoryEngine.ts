import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import { aiRouter } from './aiRouter.js';
import { NormalizedDiscovery } from './discovery/types.js';

export interface ProductStoryRecord {
  id: string;
  version: number;
  headline: string;
  summary: string;
  theme_detected: string;
  narrative_stages: Record<string, any>;
  discovery_ids: string[];
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export class ProductStoryEngine {
  /**
   * Retrieves current active Product Story record from SQLite.
   * If database is uninitialized, initializes and returns default version 1.
   */
  async getCurrentStory(): Promise<ProductStoryRecord> {
    const row = await dbGet<any>('SELECT * FROM product_story WHERE is_current = 1 ORDER BY version DESC LIMIT 1;');
    if (!row) {
      return this.initDefaultStory();
    }
    return this.mapRowToRecord(row);
  }

  /**
   * Retrieves full version history of Product Story records.
   */
  async getStoryHistory(limit = 10): Promise<ProductStoryRecord[]> {
    const rows = await dbAll<any>('SELECT * FROM product_story ORDER BY version DESC LIMIT ?;', [limit]);
    return rows.map(r => this.mapRowToRecord(r));
  }

  /**
   * Dynamically evolves Product Story ONLY when genuinely NEW discoveries exist.
   * IDEMPOTENT: Does not regenerate or increment version if discoveries are already incorporated
   * or if zero new discoveries are supplied.
   */
  async evolveStoryWithNewDiscoveries(newDiscoveries: NormalizedDiscovery[]): Promise<{
    updated: boolean;
    story: ProductStoryRecord;
    error?: string;
  }> {
    const currentStory = await this.getCurrentStory();

    // RULE 1: If 0 new discoveries, DO NOT update Product Story. Return existing unchanged.
    if (!newDiscoveries || newDiscoveries.length === 0) {
      console.log('[ProductStoryEngine] Zero new discoveries. Product Story remains unchanged.');
      return { updated: false, story: currentStory };
    }

    const newIds = newDiscoveries.map(d => d.id).filter(Boolean);
    const existingIncorporatedIds = new Set(currentStory.discovery_ids || []);

    // RULE 2: IDEMPOTENCY CHECK — check if all new IDs are already incorporated into current story
    const hasUnincorporated = newIds.some(id => !existingIncorporatedIds.has(id));
    if (!hasUnincorporated) {
      console.log('[ProductStoryEngine] All discovery IDs already incorporated in current story version. Skipping update.');
      return { updated: false, story: currentStory };
    }

    console.log(`[ProductStoryEngine] Processing batch of ${newDiscoveries.length} genuinely new discoveries for Product Story evolution...`);

    try {
      // RULE 3: AI Synthesis grounded strictly on newly discovered payload
      const promptPayload = {
        currentStory: {
          version: currentStory.version,
          headline: currentStory.headline,
          summary: currentStory.summary,
          theme: currentStory.theme_detected
        },
        newDiscoveries: newDiscoveries.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description || '',
          category: d.category || 'Other',
          capabilities: d.capabilities || [],
          url: d.url
        }))
      };

      const promptText = `
      You are the Product Story Evolution Engine for Opportunity OS.
      Evolve the Product Story based strictly on the newly discovered AI tools provided.
      Do NOT invent AI news, market trends, or tools not present in the payload.
      Retain the core product philosophy: Discover -> Understand -> Combine -> Act -> Learn.

      Input Payload:
      ${JSON.stringify(promptPayload, null, 2)}
      `;

      const aiResponse = await aiRouter.processStructuredTask<{
        headline: string;
        summary: string;
        themeDetected: string;
        narrativeStages: Record<string, any>;
      }>({
        taskType: 'product_story_evolution',
        input: JSON.stringify(promptPayload),
        prompt: promptText
      });

      if (!aiResponse.success || !aiResponse.structuredData) {
        throw new Error(aiResponse.error || 'AI synthesis produced empty output');
      }

      const evolved = aiResponse.structuredData;
      const nextVersion = currentStory.version + 1;
      const nextId = `story_v${nextVersion}`;
      const combinedIds = Array.from(new Set([...currentStory.discovery_ids, ...newIds]));
      const now = new Date().toISOString();

      // Deactivate previous active stories
      await dbRun('UPDATE product_story SET is_current = 0 WHERE is_current = 1;');

      // Insert new version
      await dbRun(
        `INSERT INTO product_story (
          id, version, headline, summary, theme_detected, narrative_stages, discovery_ids, is_current, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [
          nextId,
          nextVersion,
          evolved.headline || "Find what's newly available.",
          evolved.summary || "Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately.",
          evolved.themeDetected || 'Live Market Radar',
          JSON.stringify(evolved.narrativeStages || currentStory.narrative_stages),
          JSON.stringify(combinedIds),
          now,
          now
        ]
      );

      console.log(`[ProductStoryEngine] Product Story successfully evolved to Version ${nextVersion} (Theme: ${evolved.themeDetected})`);

      const newStoryRecord = await this.getCurrentStory();
      return { updated: true, story: newStoryRecord };
    } catch (err: any) {
      // RULE 4: FAILURE SAFETY — If story evolution fails, keep persisted discoveries intact and keep previous valid story.
      console.error('[ProductStoryEngine] Story evolution failed safely. Preserving previous valid story version:', err.message);
      return { updated: false, story: currentStory, error: err.message };
    }
  }

  private async initDefaultStory(): Promise<ProductStoryRecord> {
    const defaultStages = {
      discover: {
        id: "discover",
        badge: "01 DISCOVER · LIVE MARKET RADAR",
        headline: "Find what's newly available.",
        body: "Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately."
      },
      understand: {
        id: "understand",
        badge: "02 UNDERSTAND · SKILL & TOOL FIT",
        headline: "Match tools to what you already know.",
        body: "Instantly see realistic client services you can deliver with free tools like Gemini, Canva, and WhatsApp—zero coding required."
      },
      combine: {
        id: "combine",
        badge: "03 COMBINE · TOOL WORKFLOWS",
        headline: "Combine tools into complete services.",
        body: "Stack simple tools together to create end-to-end deliverables for local businesses, from social media kits to customer inquiry setups."
      },
      act: {
        id: "act",
        badge: "04 ACT · EXECUTION ROADMAP",
        headline: "Turn opportunity into a step-by-step plan.",
        body: "Follow clear, bite-sized checklists with copy-paste prompts and client outreach templates to land your first buyer."
      },
      learn: {
        id: "learn",
        badge: "05 LEARN · SMARTER MATCHING",
        headline: "Your results sharpen what comes next.",
        body: "Every completed project refines your matching engine to recommend higher-value opportunities tailored to your track record."
      }
    };

    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO product_story (
        id, version, headline, summary, theme_detected, narrative_stages, discovery_ids, is_current, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [
        'story_v1',
        1,
        "Find what's newly available.",
        "Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately.",
        "Live Market Radar",
        JSON.stringify(defaultStages),
        '[]',
        now,
        now
      ]
    );

    const row = await dbGet<any>('SELECT * FROM product_story WHERE id = ?;', ['story_v1']);
    return this.mapRowToRecord(row);
  }

  private mapRowToRecord(row: any): ProductStoryRecord {
    let narrativeStages: Record<string, any> = {};
    let discoveryIds: string[] = [];

    try {
      narrativeStages = typeof row.narrative_stages === 'string' ? JSON.parse(row.narrative_stages || '{}') : (row.narrative_stages || {});
    } catch {
      narrativeStages = {};
    }

    try {
      discoveryIds = typeof row.discovery_ids === 'string' ? JSON.parse(row.discovery_ids || '[]') : (row.discovery_ids || []);
    } catch {
      discoveryIds = [];
    }

    return {
      id: row.id,
      version: Number(row.version || 1),
      headline: row.headline,
      summary: row.summary,
      theme_detected: row.theme_detected,
      narrative_stages: narrativeStages,
      discovery_ids: discoveryIds,
      is_current: Boolean(row.is_current),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const productStoryEngine = new ProductStoryEngine();
