import React, { useEffect, useState } from 'react';
import { 
  Compass, 
  RefreshCw, 
  ExternalLink,
  ArrowRight,
  Zap,
  Wrench,
  Globe
} from 'lucide-react';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { 
  translateDiscoveryToSignal, 
  deduplicateItems,
  UserFacingSignal 
} from '../../utils/UserFacingViewModel.js';

interface DiscoverScreenProps {
  onScanClick: () => Promise<void>;
  isScanning: boolean;
  onNavigateTab?: (tab: any) => void;
  dataVersion?: number;
  tools?: any[];
  skills?: any[];
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ 
  onScanClick, 
  isScanning, 
  onNavigateTab, 
  dataVersion,
  tools = [],
  skills = []
}) => {
  const [rawDiscoveries, setRawDiscoveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const hasProfileSetup = (tools && tools.length > 0) || (skills && skills.length > 0);

  const fetchDiscoveries = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedSource !== 'all') params.source = selectedSource;
      const res = await api.getDiscoveries(params);
      const items = res.discoveries || [];
      setRawDiscoveries(deduplicateItems(items));
      setEmptyStateMessage(res.emptyStateMessage || null);
      setSuggestions(res.suggestions || []);
    } catch (err) {
      console.error('Failed to load new AI tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscoveries();
  }, [selectedSource, dataVersion]);

  const handleTriggerScan = async () => {
    await onScanClick();
    await fetchDiscoveries();
  };

  const signals: UserFacingSignal[] = deduplicateItems(
    rawDiscoveries
      .map(translateDiscoveryToSignal)
      .filter((sig): sig is UserFacingSignal => sig !== null)
  );

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-peach-400 uppercase tracking-wider">PERSISTENT DISCOVERY LIBRARY</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5 leading-snug sm:leading-normal">
            <Compass className="h-6 w-6 text-peach-500" />
            New AI Tools
          </h1>
          <p className="font-sans text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            Strictly personalized AI tools matching your saved profile, goals, skills, and projects.
          </p>
        </div>

        <button 
          type="button"
          onClick={handleTriggerScan} 
          disabled={isScanning} 
          className="btn-primary text-xs py-2 px-4 h-9 font-bold shadow-lg shadow-peach-500/30 border border-white/40 flex items-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-navy-950 font-bold ${isScanning ? 'animate-spin' : ''}`} />
          <span className="font-bold text-navy-950 tracking-wide">{isScanning ? 'Scanning...' : 'Check for New Tools'}</span>
        </button>
      </div>

      {/* Filter Tabs & Cross-Link Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none">
          <span className="text-xs font-mono text-slate-400 shrink-0">Source Filter:</span>
          {['all', 'github', 'huggingface', 'rss'].map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedSource === src
                  ? 'bg-peach-500 text-navy-950 font-bold shadow-md shadow-peach-500/20'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {src === 'all' ? 'All Sources' : src}
            </button>
          ))}
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('opportunities')}
            className="text-xs font-mono text-peach-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
          >
            <span>See how to sell services with these → Explore Ways to Earn</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-navy-950/60 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="text-center py-12 bg-navy-950/40 rounded-2xl border border-white/10 p-6 space-y-4 max-w-xl mx-auto">
          <div className="mx-auto w-12 h-12 rounded-full bg-peach-500/10 border border-peach-500/30 flex items-center justify-center text-peach-400">
            <Compass className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 font-display">
            {!hasProfileSetup ? 'No Tools or Skills Configured' : 'No Matching Tools Qualified'}
          </h3>
          <p className="text-slate-300 font-sans text-sm leading-relaxed">
            {!hasProfileSetup
              ? 'Add your tools and skills in your profile to discover personalized AI resources and tools matched to your capabilities.'
              : (emptyStateMessage || "No new tools currently meet your profile's relevance requirements. Your feed will update when a genuinely useful match is found.")}
          </p>
          {!hasProfileSetup && onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="btn-primary text-xs py-2.5 px-5 font-bold shadow-lg shadow-peach-500/30 inline-flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Set Up Profile →</span>
            </button>
          )}
          {hasProfileSetup && suggestions.length > 0 && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-left text-xs space-y-2">
              <span className="font-mono text-[10px] uppercase font-bold text-peach-400 tracking-wider block">RECOMMENDED ACTIONS TO IMPROVE MATCHES:</span>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {signals.map((signal) => {
            const canonicalUrl = signal.technicalDetails?.canonicalUrl;
            return (
              <GlassCard 
                key={signal.id} 
                className="p-5 flex flex-col justify-between space-y-4 hover:border-peach-500/40 transition-all group min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded bg-peach-500/20 text-peach-300 border border-peach-500/30 text-[10px] font-mono font-bold tracking-wider uppercase whitespace-normal break-words">
                      {signal.toolCategory}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold tracking-wider uppercase whitespace-nowrap">
                      {signal.cost}
                    </span>
                  </div>

                  {/* Why it matches you */}
                  {signal.whyItMatchesYou && (
                    <div className="bg-peach-500/10 p-2.5 rounded-lg border border-peach-500/20 text-xs">
                      <span className="text-[10px] font-mono text-peach-300 font-bold uppercase block mb-0.5">WHY IT MATCHES YOU</span>
                      <p className="text-slate-200 font-sans text-xs leading-relaxed">{signal.whyItMatchesYou}</p>
                    </div>
                  )}

                  {/* What it is */}
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">WHAT IT IS</span>
                    <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-peach-300 transition-colors leading-snug break-words">
                      {signal.whatItIs}
                    </h3>
                  </div>

                  {/* What it can do & why it matters */}
                  <div className="bg-navy-950/70 p-3 rounded-xl border border-white/8 space-y-1.5 text-xs font-sans min-w-0">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">WHAT IT CAN DO</span>
                      <p className="text-slate-200 leading-relaxed mt-0.5 break-words">{signal.whatYouCouldDo}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-white/10 pt-3 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Source & Tools</span>
                      <span className="font-bold text-slate-200 mt-0.5 block truncate">{signal.toolsFormatted}</span>
                    </div>

                    {canonicalUrl ? (
                      <a
                        href={canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost py-1.5 px-3 rounded-xl text-xs font-mono font-bold text-peach-400 hover:text-white border border-white/10 hover:border-peach-500/40 flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>Open Source Link</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs font-mono text-slate-400 shrink-0">Verified Resource</span>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
