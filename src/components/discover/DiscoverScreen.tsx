import React, { useEffect, useState } from 'react';
import { 
  Compass, 
  Github, 
  Rss, 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Tag, 
  X,
  FileText,
  Clock
} from 'lucide-react';
import { api, DiscoveriesResponse } from '../../services/api.js';
import { Discovery } from '../../types/index.js';

interface DiscoverScreenProps {
  onScanClick: () => Promise<void>;
  isScanning: boolean;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ onScanClick, isScanning }) => {
  const [data, setData] = useState<DiscoveriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Discovery | null>(null);

  const fetchDiscoveries = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedSource !== 'all') params.source = selectedSource;
      const res = await api.getDiscoveries(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load discoveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscoveries();
  }, [selectedSource]);

  const handleTriggerScan = async () => {
    await onScanClick();
    await fetchDiscoveries();
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'github': return Github;
      case 'huggingface': return Cpu;
      case 'rss':
      case 'web': return Rss;
      default: return Compass;
    }
  };

  const getPricingBadge = (pricingStatus: string) => {
    switch (pricingStatus) {
      case 'open_source_self_hostable':
      case 'genuinely_free':
        return <span className="badge-tag badge-emerald text-[10px] uppercase font-mono">Open Source / Free</span>;
      case 'open_weight':
        return <span className="badge-tag badge-indigo text-[10px] uppercase font-mono">Open Weight Model</span>;
      case 'free_tier':
        return <span className="badge-tag badge-amber text-[10px] uppercase font-mono">Free Tier</span>;
      case 'paid_only':
        return <span className="badge-tag badge-slate text-[10px] uppercase font-mono">Paid Only</span>;
      default:
        return <span className="badge-tag badge-slate text-[10px] uppercase font-mono">Unclear Licensing</span>;
    }
  };

  const discoveries = data?.discoveries || [];
  const scanSummary = data?.lastScanSummary;

  return (
    <div className="space-y-6 py-2 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">Phase 3 Active Engine</span>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-400" />
            Real-World Discovery Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Collected, normalized, deduplicated, and fact-verified open resources from public sources.
          </p>
        </div>

        <button onClick={handleTriggerScan} disabled={isScanning} className="btn-primary text-xs py-1.5 px-3">
          <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Pipeline...' : 'Run Discovery Scan'}</span>
        </button>
      </div>

      {/* Scan Summary Banner (If scan was run) */}
      {scanSummary && (
        <div className="panel-card p-4 bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-slate-200">Last Discovery Scan Summary</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Discovered: <strong className="text-slate-100">{scanSummary.discovered}</strong></span>
            <span>Deduplicated: <strong className="text-slate-100">{scanSummary.duplicatesRemoved}</strong></span>
            <span>Verified: <strong className="text-emerald-400">{scanSummary.verified}</strong></span>
            <span>Stored: <strong className="text-indigo-400">{scanSummary.stored}</strong></span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800/80 pb-2">
        <span className="text-xs font-mono text-slate-500 mr-2">Filter Source:</span>
        {['all', 'github', 'huggingface', 'rss'].map((src) => (
          <button
            key={src}
            onClick={() => setSelectedSource(src)}
            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
              selectedSource === src
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {src === 'all' ? 'All Sources' : src === 'rss' ? 'Web Feeds' : src}
          </button>
        ))}
      </div>

      {/* Discoveries List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-mono">Loading verified discoveries from database...</p>
        </div>
      ) : discoveries.length === 0 ? (
        /* Standby Empty State if no real discoveries logged yet */
        <div className="panel-card p-8 text-center space-y-4 max-w-xl mx-auto my-6 bg-slate-900 border border-slate-800">
          <ShieldCheck className="h-8 w-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100">No Discoveries Stored Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              The database contains no real discoveries for the selected filter. Click <strong className="text-slate-200">Run Discovery Scan</strong> to query live public adapters (GitHub API, Hugging Face Hub, Web Feeds).
            </p>
          </div>
          <button onClick={handleTriggerScan} disabled={isScanning} className="btn-primary text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Run First Discovery Scan</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {discoveries.map((item) => {
            const SourceIcon = getSourceIcon(item.source);
            return (
              <div key={item.id} className="panel-card p-5 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        <SourceIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[10px] font-mono uppercase text-slate-400">{item.source} • {item.category || item.type}</span>
                    </div>
                    {getPricingBadge(item.free_status || (item as any).pricingStatus)}
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Capabilities Tags */}
                  {item.capabilities && item.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.capabilities.map((cap, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5 text-slate-500" />
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Verified: {new Date(item.last_verified_date || (item as any).lastVerifiedAt || Date.now()).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-slate-300 hover:text-white font-medium flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3 text-indigo-400" />
                      <span>Evidence</span>
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <span>Source</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Discovery Detail & Evidence Modal */}
      {selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-4 max-w-xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">{selectedItem.source} • {selectedItem.category}</span>
                <h3 className="font-bold text-slate-100 text-base">{selectedItem.title}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px] tracking-wider">Canonical URL</span>
                <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all font-mono">
                  {selectedItem.url}
                </a>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px] tracking-wider">Description</span>
                <p className="text-slate-300 leading-relaxed mt-0.5">{selectedItem.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block">License</span>
                  <span className="text-slate-200 font-mono font-bold">{selectedItem.license || (selectedItem as any).licenseRaw || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pricing Classification</span>
                  <span className="text-emerald-400 font-mono font-bold">{selectedItem.free_status || (selectedItem as any).pricingStatus}</span>
                </div>
              </div>

              {/* Factual Evidence List */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wider">Factual Verification Evidence</h4>
                {selectedItem.evidence && (selectedItem.evidence as any[]).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedItem.evidence as any[]).map((ev, i) => (
                      <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{ev.claim}</span>
                          <span className="badge-tag badge-emerald text-[9px]">{ev.confidence || 'High'} Confidence</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{ev.evidenceText}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No detailed evidence records attached.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button onClick={() => setSelectedItem(null)} className="btn-secondary text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
