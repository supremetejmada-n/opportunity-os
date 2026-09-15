import crypto from 'crypto';
import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import { collectAllSources } from './discovery/collector.js';
import { normalizeRawItem } from './discovery/normalizer.js';
import { deduplicateDiscoveries } from './discovery/deduplicator.js';
import { verifyDiscovery, validateDiscoveryClaims } from './discovery/verifier.js';
import { classifyDiscovery } from './discovery/classifier.js';
import { NormalizedDiscovery } from './discovery/types.js';
import { opportunityEngine } from './opportunityEngine.js';
import { learningEngine } from './learningEngine.js';
import {
  Opportunity,
  ScanRecord,
  ScanResult,
  DiscoveryChangeType,
  IntelligenceExplanation
} from '../../src/types/index.js';

export class ScanEngine {
  private isScanRunning = false;

  isScanning(): boolean {
    return this.isScanRunning;
  }

  /**
   * Evaluates change type between newly discovered item and existing DB state.
   */
  detectChange(newItem: NormalizedDiscovery, existingRow: any): DiscoveryChangeType {
    if (!existingRow) return 'new';

    // Check verification status change
    if (existingRow.verification_status !== newItem.verificationStatus) {
      return 'verification_changed';
    }

    // Parse DB capabilities
    let dbCapabilities: string[] = [];
    try {
      dbCapabilities = typeof existingRow.capabilities === 'string' ? JSON.parse(existingRow.capabilities || '[]') : (existingRow.capabilities || []);
    } catch {
      dbCapabilities = [];
    }

    const capsChanged = JSON.stringify(dbCapabilities.sort()) !== JSON.stringify([...newItem.capabilities].sort());
    const pricingChanged = (existingRow.pricing_status || 'unclear') !== newItem.pricingStatus;
    const freeTierChanged = Boolean(existingRow.free_tier) !== newItem.freeTier;
    const selfHostableChanged = Boolean(existingRow.self_hostable) !== newItem.selfHostable;
    const apiAvailableChanged = Boolean(existingRow.api_available) !== newItem.apiAvailable;

    if (capsChanged || pricingChanged || freeTierChanged || selfHostableChanged || apiAvailableChanged) {
      return 'updated';
    }

    return 'unchanged';
  }

  /**
   * Executes the full On-Demand Opportunity Scan pipeline.
   */
  async runOnDemandScan(): Promise<ScanResult> {
    if (this.isScanRunning) {
      throw new Error('A scan is already in progress. Please wait for it to complete.');
    }

    this.isScanRunning = true;
    const scanId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    // Initialize scan record in DB
    await dbRun(
      `INSERT INTO scan_records (id, started_at, completed_at, status, sources_attempted, items_collected, items_normalized, duplicates_removed, verified_count, rejected_count, changed_count, opportunities_generated, errors, duration_ms, created_at)
       VALUES (?, ?, NULL, 'running', 0, 0, 0, 0, 0, 0, 0, 0, '[]', 0, ?)`,
      [scanId, startedAt, startedAt]
    );

    const errors: string[] = [];
    let sourcesAttempted = 0;
    let itemsCollected = 0;
    let itemsNormalized = 0;
    let duplicatesRemoved = 0;
    let verifiedCount = 0;
    let rejectedCount = 0;
    let changedCount = 0;
    let opportunitiesGenerated = 0;

    try {
      console.log(`[Scan Engine] Initiating Scan ID: ${scanId} at ${startedAt}`);

      // 1. COLLECT
      let rawItems: any[] = [];
      let statusReports: any[] = [];
      try {
        const collectRes = await collectAllSources();
        rawItems = collectRes.rawItems || [];
        statusReports = collectRes.statusReports || [];
        sourcesAttempted = statusReports.length;
        itemsCollected = rawItems.length;

        for (const report of statusReports) {
          if (report.status === 'failed' && report.error) {
            errors.push(`Source '${report.source}' failed: ${report.error}`);
          }
        }
      } catch (collErr: any) {
        errors.push(`Collector phase error: ${collErr.message}`);
      }

      // 2. NORMALIZE
      const normalizedItems: NormalizedDiscovery[] = rawItems.map(raw => normalizeRawItem(raw));
      itemsNormalized = normalizedItems.length;

      // 3. DEDUPLICATE
      const { uniqueItems, duplicatesCount } = await deduplicateDiscoveries(normalizedItems);
      duplicatesRemoved = duplicatesCount;

      // 4. VERIFY & CLASSIFY & CHANGE DETECTION
      const processedItems: { discovery: NormalizedDiscovery; changeType: DiscoveryChangeType }[] = [];

      for (const item of uniqueItems) {
        // Basic validity check & relevance pre-filter (relevance >= 0.35)
        if (item.relevanceScore !== undefined && item.relevanceScore < 0.35) {
          rejectedCount++;
          continue;
        }

        const verifiedItem = verifyDiscovery(item);
        const classifiedItem = await classifyDiscovery(verifiedItem);
        const finalItem = validateDiscoveryClaims(classifiedItem);

        if (finalItem.verificationStatus === 'verified' || finalItem.verificationStatus === 'partially_verified') {
          verifiedCount++;
        }

        // Retrieve existing DB record to detect changes
        const existingRow = await dbGet<any>('SELECT * FROM discoveries WHERE id = ?;', [finalItem.id]);
        const changeType = this.detectChange(finalItem, existingRow);

        if (changeType === 'new' || changeType === 'updated' || changeType === 'verification_changed') {
          changedCount++;
        }

        processedItems.push({ discovery: finalItem, changeType });
      }

      // 5. PERSIST DISCOVERIES (UPSERT)
      for (const { discovery: item } of processedItems) {
        try {
          await dbRun(
            `INSERT INTO discoveries (
              id, title, description, url, source, source_id, type, category, capabilities, author, license,
              pricing_status, free_tier, open_source, open_weight, self_hostable, api_available, local_available,
              first_discovered_at, last_verified_at, last_updated_at, evidence, confidence, verification_status, is_demo_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              type = excluded.type,
              category = excluded.category,
              capabilities = excluded.capabilities,
              license = excluded.license,
              pricing_status = excluded.pricing_status,
              free_tier = excluded.free_tier,
              open_source = excluded.open_source,
              open_weight = excluded.open_weight,
              self_hostable = excluded.self_hostable,
              api_available = excluded.api_available,
              local_available = excluded.local_available,
              last_verified_at = excluded.last_verified_at,
              evidence = excluded.evidence,
              confidence = excluded.confidence,
              verification_status = excluded.verification_status;`,
            [
              item.id,
              item.title,
              item.description,
              item.url,
              item.source,
              item.sourceId,
              item.type,
              item.category,
              JSON.stringify(item.capabilities),
              item.author,
              item.license,
              item.pricingStatus,
              item.freeTier ? 1 : 0,
              item.openSource ? 1 : 0,
              item.openWeight ? 1 : 0,
              item.selfHostable ? 1 : 0,
              item.apiAvailable ? 1 : 0,
              item.localAvailable ? 1 : 0,
              item.firstDiscoveredAt,
              item.lastVerifiedAt,
              item.lastUpdatedAt,
              JSON.stringify(item.evidence),
              item.confidence,
              item.verificationStatus,
              0
            ]
          );

          await dbRun('DELETE FROM verification_records WHERE discovery_id = ?;', [item.id]);

          for (let i = 0; i < item.evidence.length; i++) {
            const ev = item.evidence[i];
            const evId = `ev_${item.id}_${i + 1}`;
            await dbRun(
              `INSERT INTO verification_records (
                id, discovery_id, verification_timestamp, verification_status, claim, source_url, source_type, evidence_text, confidence
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [evId, item.id, ev.retrievedAt, item.verificationStatus, ev.claim, ev.sourceUrl, ev.sourceType, ev.evidenceText, ev.confidence]
            );
          }
        } catch (dbErr: any) {
          console.warn(`[Scan Engine] DB write error for item '${item.id}': ${dbErr.message}`);
        }
      }

      // 6. EVALUATE OPPORTUNITIES VIA PHASE 4 & 7 ENGINES
      const candidateOpps: any[] = await opportunityEngine.evaluateOpportunities();

      // STRICT RULE: Apply base quality threshold (score >= 65 before learning adjustment)
      // Note: evaluateOpportunities already filters base score >= 65 and applies personalization adjustments bounded to ±10.
      const qualifiedOpps: Opportunity[] = (candidateOpps as Opportunity[]).filter(opp => {
        const baseScore = opp.score - (opp.learningAdjustment || 0);
        return baseScore >= 65;
      });

      // 7. RESULT LIMIT: Return top 3-5 recommendations (or fewer if fewer qualify). Never fabricate.
      const topRecommendations = qualifiedOpps.slice(0, 5);
      opportunitiesGenerated = topRecommendations.length;

      // Attach detailed "Why am I seeing this?" evidence explanations
      for (const opp of topRecommendations) {
        let tools: string[] = [];
        try {
          tools = typeof opp.requiredTools === 'string' ? JSON.parse(opp.requiredTools) : (opp.requiredTools || []);
        } catch {
          tools = [];
        }

        const learningExp = await learningEngine.calculateOpportunityAdjustment({
          id: opp.id,
          title: opp.title,
          customerType: opp.customerType || opp.target_customer,
          requiredTools: tools
        });

        // Determine matching changeType
        let itemChangeType: DiscoveryChangeType = 'unchanged';
        if (opp.discoveryIds && opp.discoveryIds.length > 0) {
          const matched = processedItems.find(pi => pi.discovery.id === opp.discoveryIds![0]);
          if (matched) itemChangeType = matched.changeType;
        }

        const intelExp: IntelligenceExplanation = {
          whatIsIt: opp.summary || opp.title,
          whyItMatters: opp.whyMatch || `High-demand service opportunity for ${opp.target_customer || opp.customerType || 'target clients'}.`,
          whyItMattersToUser: learningExp.explanation || `Matches your technical skills and profile budget preferences.`,
          canExecute: true,
          canStartZeroCost: opp.startupCost === 0,
          whoCouldPay: opp.target_customer || opp.customerType || 'Target Businesses',
          opportunitySummary: opp.summary || opp.title,
          confidence: opp.confidence || 'Medium',
          evidence: opp.evidence || {},
          recommendedNextAction: 'Generate 6-Phase Action Plan in Action Plans screen.',
          changeType: itemChangeType
        };

        (opp as any).intelligenceExplanation = intelExp;
      }

      const durationMs = Date.now() - startTimeMs;
      const completedAt = new Date().toISOString();

      let finalStatus: 'completed' | 'partial' | 'failed' = 'completed';
      if (errors.length > 0 && itemsCollected > 0) {
        finalStatus = 'partial';
      } else if (itemsCollected === 0 && errors.length > 0) {
        finalStatus = 'failed';
      }

      // Finalize scan record in DB
      await dbRun(
        `UPDATE scan_records SET
          completed_at = ?,
          status = ?,
          sources_attempted = ?,
          items_collected = ?,
          items_normalized = ?,
          duplicates_removed = ?,
          verified_count = ?,
          rejected_count = ?,
          changed_count = ?,
          opportunities_generated = ?,
          errors = ?,
          duration_ms = ?
        WHERE id = ?;`,
        [
          completedAt,
          finalStatus,
          sourcesAttempted,
          itemsCollected,
          itemsNormalized,
          duplicatesRemoved,
          verifiedCount,
          rejectedCount,
          changedCount,
          opportunitiesGenerated,
          JSON.stringify(errors),
          durationMs,
          scanId
        ]
      );

      const record = await this.getScanRecordById(scanId);

      return {
        scanRecord: record!,
        recommendations: topRecommendations,
        totalRecommended: topRecommendations.length
      };
    } catch (fatalErr: any) {
      console.error('[Scan Engine] Fatal error during scan execution:', fatalErr);
      const durationMs = Date.now() - startTimeMs;
      const completedAt = new Date().toISOString();
      errors.push(`Fatal scan error: ${fatalErr.message}`);

      await dbRun(
        `UPDATE scan_records SET
          completed_at = ?,
          status = 'failed',
          errors = ?,
          duration_ms = ?
        WHERE id = ?;`,
        [completedAt, JSON.stringify(errors), durationMs, scanId]
      );

      const record = await this.getScanRecordById(scanId);

      return {
        scanRecord: record || {
          id: scanId,
          started_at: startedAt,
          completed_at: completedAt,
          status: 'failed',
          sources_attempted: sourcesAttempted,
          items_collected: itemsCollected,
          items_normalized: itemsNormalized,
          duplicates_removed: duplicatesRemoved,
          verified_count: verifiedCount,
          rejected_count: rejectedCount,
          changed_count: changedCount,
          opportunities_generated: 0,
          errors,
          duration_ms: durationMs,
          created_at: startedAt
        },
        recommendations: [],
        totalRecommended: 0
      };
    } finally {
      this.isScanRunning = false;
    }
  }

  /**
   * Retrieves scan record by ID
   */
  async getScanRecordById(id: string): Promise<ScanRecord | null> {
    const row = await dbGet<any>('SELECT * FROM scan_records WHERE id = ?;', [id]);
    if (!row) return null;
    return this.mapRowToScanRecord(row);
  }

  /**
   * Retrieves latest scan record
   */
  async getLatestScanRecord(): Promise<ScanRecord | null> {
    const row = await dbGet<any>('SELECT * FROM scan_records ORDER BY started_at DESC LIMIT 1;');
    if (!row) return null;
    return this.mapRowToScanRecord(row);
  }

  /**
   * Retrieves scan execution history
   */
  async getScanHistory(limit: number = 20): Promise<ScanRecord[]> {
    const rows = await dbAll<any>('SELECT * FROM scan_records ORDER BY started_at DESC LIMIT ?;', [limit]);
    return rows.map(r => this.mapRowToScanRecord(r));
  }

  private mapRowToScanRecord(row: any): ScanRecord {
    let errors: string[] = [];
    try {
      errors = typeof row.errors === 'string' ? JSON.parse(row.errors || '[]') : (row.errors || []);
    } catch {
      errors = [];
    }

    return {
      id: row.id,
      started_at: row.started_at,
      completed_at: row.completed_at || null,
      status: row.status as any,
      sources_attempted: row.sources_attempted || 0,
      items_collected: row.items_collected || 0,
      items_normalized: row.items_normalized || 0,
      duplicates_removed: row.duplicates_removed || 0,
      verified_count: row.verified_count || 0,
      rejected_count: row.rejected_count || 0,
      changed_count: row.changed_count || 0,
      opportunities_generated: row.opportunities_generated || 0,
      errors,
      duration_ms: row.duration_ms || 0,
      created_at: row.created_at || row.started_at
    };
  }
}

export const scanEngine = new ScanEngine();
