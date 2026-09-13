import { ScanSummary, NormalizedDiscovery } from './types.js';
import { collectAllSources } from './collector.js';
import { normalizeRawItem } from './normalizer.js';
import { deduplicateDiscoveries } from './deduplicator.js';
import { verifyDiscovery, validateDiscoveryClaims } from './verifier.js';
import { classifyDiscovery } from './classifier.js';
import { dbAll, dbGet, dbRun } from '../../db/sqlite.js';

export class DiscoveryEngine {
  private isScanRunning = false;
  private lastScanSummary: ScanSummary | null = null;

  isScanning(): boolean {
    return this.isScanRunning;
  }

  getLastScanSummary(): ScanSummary | null {
    return this.lastScanSummary;
  }

  async runScan(): Promise<ScanSummary> {
    if (this.isScanRunning) {
      throw new Error('A discovery scan is already running. Please wait for it to complete.');
    }

    this.isScanRunning = true;
    const now = new Date().toISOString();

    try {
      console.log('====================================================');
      console.log(' [Discovery Engine] Initiating Real Discovery Scan ');
      console.log('====================================================');

      const countBeforeRow = await dbGet('SELECT COUNT(*) as cnt FROM discoveries;');
      const totalDbRowsBefore = countBeforeRow ? countBeforeRow.cnt : 0;
      console.log(`[DiscoveryEngine] Total database row count before scan: ${totalDbRowsBefore}`);

      // 1. COLLECT
      const { rawItems, statusReports } = await collectAllSources();
      const discoveredCount = rawItems.length;

      // 2. NORMALIZE
      const normalizedItems: NormalizedDiscovery[] = rawItems.map(raw => normalizeRawItem(raw));
      const normalizedCount = normalizedItems.length;

      // 3. RELEVANCE FILTERING
      let rejectedIrrelevant = 0;
      const relevantItems: NormalizedDiscovery[] = [];
      for (const item of normalizedItems) {
        if (item.relevanceScore !== undefined && item.relevanceScore < 0.35) {
          rejectedIrrelevant++;
        } else {
          relevantItems.push(item);
        }
      }

      // 4. DEDUPLICATE
      const { uniqueItems, duplicatesCount } = await deduplicateDiscoveries(relevantItems);

      // 5. VERIFY & 6. CLASSIFY
      let verifiedCount = 0;
      let partiallyVerifiedCount = 0;
      let unverifiedCount = 0;
      let storedCount = 0;

      const processedItems: NormalizedDiscovery[] = [];

      for (const item of uniqueItems) {
        const verifiedItem = verifyDiscovery(item);
        const classifiedItem = await classifyDiscovery(verifiedItem);
        // Pre-persistence Boolean Consistency Rule enforcement
        const finalValidItem = validateDiscoveryClaims(classifiedItem);

        if (finalValidItem.verificationStatus === 'verified') verifiedCount++;
        else if (finalValidItem.verificationStatus === 'partially_verified') partiallyVerifiedCount++;
        else unverifiedCount++;

        processedItems.push(finalValidItem);
      }

      // 7. STORE IN SQLITE DATABASE (UPSERT)
      for (const item of processedItems) {
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

          // Clear old verification records & insert updated ones
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

          storedCount++;
        } catch (dbErr: any) {
          console.warn(`[DiscoveryEngine] Failed to store item '${item.id}': ${dbErr.message}`);
        }
      }

      const countAfterRow = await dbGet('SELECT COUNT(*) as cnt FROM discoveries;');
      const totalDbRowsAfter = countAfterRow ? countAfterRow.cnt : 0;
      console.log(`[DiscoveryEngine] Total database row count after scan: ${totalDbRowsAfter}`);

      const summary: ScanSummary = {
        discovered: discoveredCount,
        normalized: normalizedCount,
        duplicatesRemoved: duplicatesCount,
        rejectedIrrelevant,
        verified: verifiedCount,
        partiallyVerified: partiallyVerifiedCount,
        unverified: unverifiedCount,
        failed: 0,
        stored: storedCount,
        totalDbRowsAfter,
        sources: statusReports,
        completedAt: now
      };

      this.lastScanSummary = summary;
      console.log('[Discovery Engine] Scan complete summary:', summary);
      return summary;
    } finally {
      this.isScanRunning = false;
    }
  }

  /**
   * Re-evaluates all stored records in SQLite against Phase 3.3 hardened rules.
   */
  async reevaluateExistingDatabase(): Promise<{
    totalBefore: number;
    reclassified: number;
    downgraded: number;
    rejected: number;
    verifiedCount: number;
    partiallyVerifiedCount: number;
    unverifiedCount: number;
    totalAfter: number;
  }> {
    const rows = await dbAll('SELECT * FROM discoveries;');
    const totalBefore = rows.length;

    let reclassified = 0;
    let downgraded = 0;
    let rejected = 0;
    let verifiedCount = 0;
    let partiallyVerifiedCount = 0;
    let unverifiedCount = 0;
    let totalAfter = 0;

    for (const r of rows) {
      const original = this.mapRowToDiscovery(r);

      // Verify and classify against updated rules
      const verifiedItem = verifyDiscovery(original);
      const classifiedItem = await classifyDiscovery(verifiedItem);
      // Mandatory Pre-persistence invariant validation
      const finalValidItem = validateDiscoveryClaims(classifiedItem);

      // Track metric changes
      if (original.type !== finalValidItem.type) reclassified++;
      if (original.verificationStatus === 'verified' && finalValidItem.verificationStatus !== 'verified') downgraded++;

      if (finalValidItem.verificationStatus === 'verified') verifiedCount++;
      else if (finalValidItem.verificationStatus === 'partially_verified') partiallyVerifiedCount++;
      else unverifiedCount++;

      // Update SQLite record
      await dbRun(
        `UPDATE discoveries SET
          type = ?, category = ?, license = ?, pricing_status = ?,
          free_tier = ?, open_source = ?, open_weight = ?, self_hostable = ?,
          api_available = ?, local_available = ?, evidence = ?, confidence = ?, verification_status = ?, last_verified_at = ?
        WHERE id = ?;`,
        [
          finalValidItem.type,
          finalValidItem.category,
          finalValidItem.license,
          finalValidItem.pricingStatus,
          finalValidItem.freeTier ? 1 : 0,
          finalValidItem.openSource ? 1 : 0,
          finalValidItem.openWeight ? 1 : 0,
          finalValidItem.selfHostable ? 1 : 0,
          finalValidItem.apiAvailable ? 1 : 0,
          finalValidItem.localAvailable ? 1 : 0,
          JSON.stringify(finalValidItem.evidence),
          finalValidItem.confidence,
          finalValidItem.verificationStatus,
          finalValidItem.lastVerifiedAt,
          finalValidItem.id
        ]
      );

      // Update verification records
      await dbRun('DELETE FROM verification_records WHERE discovery_id = ?;', [finalValidItem.id]);
      for (let i = 0; i < finalValidItem.evidence.length; i++) {
        const ev = finalValidItem.evidence[i];
        const evId = `ev_${finalValidItem.id}_${i + 1}`;
        await dbRun(
          `INSERT INTO verification_records (
            id, discovery_id, verification_timestamp, verification_status, claim, source_url, source_type, evidence_text, confidence
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [evId, finalValidItem.id, ev.retrievedAt, finalValidItem.verificationStatus, ev.claim, ev.sourceUrl, ev.sourceType, ev.evidenceText, ev.confidence]
        );
      }

      totalAfter++;
    }

    return {
      totalBefore,
      reclassified,
      downgraded,
      rejected,
      verifiedCount,
      partiallyVerifiedCount,
      unverifiedCount,
      totalAfter
    };
  }

  async getDiscoveries(filters: {
    type?: string;
    category?: string;
    source?: string;
    verificationStatus?: string;
    pricingStatus?: string;
    limit?: number;
  } = {}): Promise<NormalizedDiscovery[]> {
    let sql = 'SELECT * FROM discoveries WHERE 1=1';
    const params: any[] = [];

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.source) {
      sql += ' AND source = ?';
      params.push(filters.source);
    }
    if (filters.verificationStatus) {
      sql += ' AND verification_status = ?';
      params.push(filters.verificationStatus);
    }
    if (filters.pricingStatus) {
      sql += ' AND pricing_status = ?';
      params.push(filters.pricingStatus);
    }

    sql += ' ORDER BY first_discovered_at DESC';
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await dbAll(sql, params);
    return rows.map(r => this.mapRowToDiscovery(r));
  }

  async getDiscoveryById(id: string): Promise<NormalizedDiscovery | null> {
    const row = await dbGet('SELECT * FROM discoveries WHERE id = ?;', [id]);
    if (!row) return null;

    const evidenceRows = await dbAll('SELECT * FROM verification_records WHERE discovery_id = ?;', [id]);
    const discovery = this.mapRowToDiscovery(row);

    if (evidenceRows && evidenceRows.length > 0) {
      discovery.evidence = evidenceRows.map(ev => ({
        claim: ev.claim,
        sourceUrl: ev.source_url,
        sourceType: ev.source_type,
        retrievedAt: ev.verification_timestamp,
        evidenceText: ev.evidence_text,
        confidence: ev.confidence
      }));
    }

    return discovery;
  }

  private mapRowToDiscovery(row: any): NormalizedDiscovery {
    let capabilities: string[] = [];
    let evidence: any[] = [];
    try {
      capabilities = typeof row.capabilities === 'string' ? JSON.parse(row.capabilities || '[]') : row.capabilities;
      evidence = typeof row.evidence === 'string' ? JSON.parse(row.evidence || '[]') : row.evidence;
    } catch (e) {}

    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      url: row.url,
      source: row.source,
      sourceId: row.source_id || '',
      type: row.type || 'other',
      category: row.category || 'Other',
      capabilities: capabilities || [],
      author: row.author || 'Unknown',
      license: row.license || 'Unspecified',
      pricingStatus: row.pricing_status || 'unclear',
      freeTier: Boolean(row.free_tier),
      openSource: Boolean(row.open_source),
      openWeight: Boolean(row.open_weight),
      selfHostable: Boolean(row.self_hostable),
      apiAvailable: Boolean(row.api_available),
      localAvailable: Boolean(row.local_available),
      firstDiscoveredAt: row.first_discovered_at,
      lastVerifiedAt: row.last_verified_at,
      lastUpdatedAt: row.last_updated_at,
      evidence: evidence || [],
      confidence: row.confidence || 'Low',
      verificationStatus: row.verification_status || 'unverified',
      isDemoData: Boolean(row.is_demo_data)
    };
  }
}

export const discoveryEngine = new DiscoveryEngine();
