import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  Activity, 
  Globe, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { MetalText } from 'metal-fx';
import { deduplicateItems } from '../../utils/UserFacingViewModel.js';

interface ScanScreenProps {
  onNavigateTab: (tab: 'discover' | 'opportunities' | 'combine') => void;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({ onNavigateTab }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanRecord, setScanRecord] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestScan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLatestScan();
      if (res.success && res.scanRecord) {
        setScanRecord(res.scanRecord);
      }
      // Also load current top opportunities evaluated
      const oppRes = await api.getOpportunities({ limit: '6' });
      setRecommendations(oppRes.opportunities || []);
    } catch (err: any) {
      console.error('Failed to load scan record:', err);
      setError(err.message || 'Failed to fetch scan status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestScan();
  }, []);

  const handleRunScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setNotice('Initiating intelligence scan across GitHub, HuggingFace, RSS feeds, and product registries...');
    setError(null);
    try {
      const res = await api.triggerScan();
      setScanRecord(res.scanRecord);
      if (res.recommendations && res.recommendations.length > 0) {
        setRecommendations(res.recommendations);
      }
      setNotice(res.message || 'Scan completed cleanly.');
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Scan encountered an issue');
    } finally {
      setIsScanning(false);
    }
  };

  // Format timestamp safely
  const scanTime = scanRecord?.created_at
    ? new Date(scanRecord.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not scanned yet';

  const sourcesCheckedCount = scanRecord?.sources_checked 
    ? (typeof scanRecord.sources_checked === 'string' ? JSON.parse(scanRecord.sources_checked).length : scanRecord.sources_checked.length)
    : 4;

  const newDiscoveriesCount = scanRecord?.new_discoveries_count ?? 0;
  const newOpportunitiesCount = scanRecord?.new_opportunities_count ?? 0;
  const changedItemsCount = scanRecord?.changed_items_count ?? 0;

  return (
    <div className="space-y-6 py-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-peach-400 uppercase tracking-wider">ON-DEMAND INTELLIGENCE REFRESH</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5">
            <RefreshCw className={`h-6 w-6 text-peach-500 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Now
          </h1>
          <p className="font-sans text-xs text-slate-300 mt-0.5">
            Check what has changed across AI registries, models, open-source repositories, and market signals.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isScanning}
          className="btn-primary py-3 px-6 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-peach-500/25 border border-white/40 cursor-pointer active:scale-95 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Adapters...' : 'Run Intelligence Refresh Scan'}</span>
        </button>
      </div>

      {/* Notice & Error Alerts */}
      {notice && (
        <div className="bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 text-xs p-3.5 rounded-xl flex items-center gap-2 font-mono">
          <Activity className="h-4 w-4 text-indigo-400 animate-spin" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-xs p-3.5 rounded-xl flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={handleRunScan} className="underline text-red-300 font-bold hover:text-white cursor-pointer">Retry Scan</button>
        </div>
      )}

      {/* Scan Telemetry Dashboard Bar */}
      <GlassCard className="p-6 border-white/15 bg-slate-950/70 backdrop-blur-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
              {isScanning ? 'SCANNING ENGINE ACTIVE' : 'INTELLIGENCE PIPELINE STANDBY'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Clock className="h-3.5 w-3.5 text-peach-400" />
            <span>Last Scanned: <strong className="text-slate-200">{scanTime}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="bg-navy-950/70 p-3.5 rounded-xl border border-white/8 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Sources Evaluated</span>
            <span className="font-mono text-lg font-bold text-slate-100 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-peach-400" />
              {sourcesCheckedCount} Feeds
            </span>
          </div>

          <div className="bg-navy-950/70 p-3.5 rounded-xl border border-white/8 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">New Discoveries</span>
            <span className="font-mono text-lg font-bold text-emerald-400">
              +{newDiscoveriesCount} Items
            </span>
          </div>

          <div className="bg-navy-950/70 p-3.5 rounded-xl border border-white/8 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Changed Items</span>
            <span className="font-mono text-lg font-bold text-amber-400">
              {changedItemsCount} Updated
            </span>
          </div>

          <div className="bg-navy-950/70 p-3.5 rounded-xl border border-white/8 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Matched Opportunities</span>
            <span className="font-mono text-lg font-bold text-peach-400">
              {newOpportunitiesCount || recommendations.length} Services
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Delta Results Breakdown */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-navy-950/60 border border-white/10 animate-pulse" />
        </div>
      ) : newDiscoveriesCount === 0 && changedItemsCount === 0 && recommendations.length === 0 ? (
        /* Unchanged State */
        <div className="metal-panel-primary p-8 rounded-2xl border border-white/10 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto opacity-80" />
          <h3 className="font-display text-base font-bold text-white uppercase">Nothing Important Changed</h3>
          <p className="font-sans text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            No critical shifts or new unread tools were detected since your last scan at <strong>{scanTime}</strong>. Your existing opportunity stack remains optimal.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section: What Matters to Me */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-peach-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-peach-400" />
                What Matters to Me (Fresh Opportunity Delta)
              </span>
              <button
                onClick={() => onNavigateTab('opportunities')}
                className="text-xs font-mono text-peach-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>View All Ways to Earn</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {deduplicateItems(recommendations).slice(0, 4).map((opp) => (
                <GlassCard
                  key={opp.id}
                  className="p-5 flex flex-col justify-between space-y-3 hover:border-peach-500/40 transition-all min-w-0"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase whitespace-nowrap">
                        NEW DELTA
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold whitespace-nowrap">
                        Score: {Math.round(opp.score || 85)}%
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-white leading-snug break-words">
                      {opp.title}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2 break-words">
                      {opp.summary || opp.concrete_outcome}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-bold">
                      <MetalText font="700 12px Inter, sans-serif" color="#34d399">
                        {opp.earning_potential || 'Free tier setup'}
                      </MetalText>
                    </span>

                    <button
                      onClick={() => onNavigateTab('opportunities')}
                      className="text-xs font-mono font-bold text-peach-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore Service →</span>
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
