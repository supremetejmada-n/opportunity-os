// Discovery Engine Types & Interfaces

export type DiscoverySourceType = 'github' | 'huggingface' | 'rss' | 'web';
export type DiscoveryType = 
  | 'ai_tool' 
  | 'open_source_project' 
  | 'ai_model' 
  | 'api' 
  | 'automation_tool' 
  | 'dataset' 
  | 'developer_tool' 
  | 'capability' 
  | 'market_signal' 
  | 'other';

export type PricingStatus = 
  | 'genuinely_free' 
  | 'free_tier' 
  | 'free_trial' 
  | 'open_source_self_hostable' 
  | 'open_weight' 
  | 'free_credits' 
  | 'paid_only' 
  | 'unclear' 
  | 'unknown';

export type VerificationStatus = 
  | 'verified' 
  | 'partially_verified' 
  | 'unverified' 
  | 'conflicting' 
  | 'expired';

export interface EvidenceRecord {
  claim: string;
  sourceUrl: string;
  sourceType: DiscoverySourceType;
  retrievedAt: string;
  evidenceText: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface RawDiscoveryItem {
  source: DiscoverySourceType;
  sourceId: string;
  title: string;
  description: string;
  url: string;
  canonicalResourceUrl?: string;
  author?: string;
  licenseRaw?: string;
  tagsRaw?: string[];
  rawMeta?: Record<string, any>;
  retrievedAt: string;
}

export interface NormalizedDiscovery {
  id: string;
  title: string;
  description: string;
  url: string;
  canonicalResourceUrl?: string;
  source: DiscoverySourceType;
  sourceId: string;
  type: DiscoveryType;
  category: string;
  capabilities: string[];
  author: string;
  license: string;
  pricingStatus: PricingStatus;
  freeTier: boolean;
  openSource: boolean;
  openWeight: boolean;
  selfHostable: boolean;
  apiAvailable: boolean;
  localAvailable: boolean;
  firstDiscoveredAt: string;
  lastVerifiedAt: string;
  lastUpdatedAt: string;
  evidence: EvidenceRecord[];
  confidence: 'High' | 'Medium' | 'Low';
  verificationStatus: VerificationStatus;
  relevanceScore?: number;
  rawMeta?: Record<string, any>;
  isDemoData: boolean;
}

export interface SourceStatusReport {
  source: DiscoverySourceType;
  name: string;
  enabled: boolean;
  success: boolean;
  collectedCount: number;
  error?: string;
  lastRunAt: string;
}

export interface ScanSummary {
  discovered: number;
  normalized: number;
  duplicatesRemoved: number;
  rejectedIrrelevant: number;
  verified: number;
  partiallyVerified: number;
  unverified: number;
  failed: number;
  stored: number;
  totalDbRowsAfter?: number;
  sources: SourceStatusReport[];
  completedAt: string;
}

export interface SourceAdapter {
  name: string;
  sourceType: DiscoverySourceType;
  isEnabled(): boolean;
  collect(): Promise<RawDiscoveryItem[]>;
}

