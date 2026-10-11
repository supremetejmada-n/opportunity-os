import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { MetalText } from 'metal-fx';
import { 
  translateCombinationToArchitecture, 
  deduplicateItems,
  UserFacingArchitecture 
} from '../../utils/UserFacingViewModel.js';
import { OpportunityDetailModal } from '../widgets/OpportunityDetailModal.js';

import { NavTab } from '../layout/Navbar.js';
import { useSubscription } from '../../context/SubscriptionContext.js';

interface CombineScreenProps {
  tools?: any[];
  onNavigateTab?: (tab: NavTab) => void;
  onStartPlan?: (id?: string) => void;
  onOpenGuide?: (card: any) => void;
  dataVersion?: number;
}

export const CombineScreen: React.FC<CombineScreenProps> = ({ tools = [], onNavigateTab, onStartPlan, onOpenGuide, dataVersion }) => {
  const { isEntitled, subscription, openSubscriptionModal } = useSubscription();
  const availableProfileTools: string[] = Array.from(
    new Set(tools.map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean))
  );

  const [discoveredTools, setDiscoveredTools] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [architectures, setArchitectures] = useState<UserFacingArchitecture[]>([]);
  const [selectedArch, setSelectedArch] = useState<{ card: any; anchorEl: HTMLElement } | null>(null);

  // Load verified discoveries from database
  useEffect(() => {
    let isMounted = true;
    const loadDiscoveries = async () => {
      try {
        const res = await api.getDiscoveries({ limit: '25' });
        if (!isMounted) return;
        const items = res.discoveries || [];
        const names = items
          .filter((d: any) => d.verification_status !== 'rejected')
          .map((d: any) => d.title)
          .filter(Boolean);
        setDiscoveredTools(Array.from(new Set(names)));
      } catch (err) {
        console.error('Failed to load discoveries for combiner:', err);
      }
    };
    loadDiscoveries();
    return () => { isMounted = false; };
  }, [dataVersion]);

  const allAvailableTools = Array.from(new Set([...availableProfileTools, ...discoveredTools]));

  useEffect(() => {
    setSelectedTools(prev => prev.filter(t => allAvailableTools.includes(t)));
  }, [tools, discoveredTools]);

  const toggleTool = (tool: string) => {
    let next: string[];
    if (selectedTools.includes(tool)) {
      next = selectedTools.filter((t) => t !== tool);
    } else {
      next = [...selectedTools, tool];
    }
    setSelectedTools(next);
    synthesizeArchitectures(next);
  };

  const synthesizeArchitectures = async (toolList: string[]) => {
    try {
      setLoading(true);
      if (toolList.length === 0) {
        // Load pre-computed top combinations from SQLite database
        const res = await api.getCombinations({ limit: '12' });
        const syn = translateCombinationToArchitecture([], res.combinations || []);
        setArchitectures(deduplicateItems(syn));
        return;
      }
      const res = await api.generateCombinations({ toolIds: toolList });
      const syn = translateCombinationToArchitecture(toolList, res.combinations || []);
      setArchitectures(deduplicateItems(syn));
    } catch (err) {
      console.error('Failed to combine tools:', err);
      const fallback = translateCombinationToArchitecture(toolList);
      setArchitectures(deduplicateItems(fallback));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    synthesizeArchitectures(selectedTools);
  }, [dataVersion]);

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="border-b border-white/10 pb-4">
        <span className="text-[10px] font-mono font-bold text-peach-400 uppercase tracking-wider">TOOL COMBINER</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5 leading-snug sm:leading-normal">
          <Layers className="h-6 w-6 text-peach-500" />
          Combine Tools
        </h1>
        <p className="font-sans text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
          Select profile tools, newly discovered AI capabilities, or both. We'll show you practical workflows and services you can start right now.
        </p>
      </div>

      {/* Zero Tools Onboarding State or Tool Selection Grid */}
      {allAvailableTools.length === 0 ? (
        <div className="metal-panel-primary p-8 rounded-2xl border border-white/10 text-center space-y-4 max-w-lg mx-auto my-8 shadow-xl">
          <div className="mx-auto w-12 h-12 rounded-full bg-peach-500/10 border border-peach-500/30 flex items-center justify-center text-peach-400">
            <Layers className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-slate-100 uppercase tracking-wide">No Tools Available Yet</h3>
            <p className="font-sans text-xs text-slate-300 leading-relaxed">
              Add tools in your profile or trigger an AI discovery scan to unlock practical combinations and client workflows.
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="btn-primary text-xs py-2.5 px-5 font-bold shadow-lg shadow-peach-500/30 inline-flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Set Up Your Tools →</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tool Selection Grid */}
          <div className="metal-panel-primary p-4 sm:p-5 rounded-2xl border border-white/15 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                CHOOSE YOUR TOOLS
              </span>
              <span className="text-xs font-mono font-bold">
                <MetalText font="700 12px Inter, sans-serif" color="#ffaa8a">
                  {`${selectedTools.length} Selected`}
                </MetalText>
              </span>
            </div>

            {/* Profile Tools Group */}
            {availableProfileTools.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                  My Profile Tools
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableProfileTools.map((tool) => {
                    const isSelected = selectedTools.includes(tool);
                    return (
                      <button
                        key={`prof-${tool}`}
                        onClick={() => toggleTool(tool)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-[0.97] flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-peach-500 text-navy-950 border border-peach-400 shadow-md shadow-peach-500/20'
                            : 'bg-white/[0.05] text-slate-300 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 fill-current" />}
                        <span>{tool}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Discovered Tools Group */}
            {discoveredTools.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  <span className="text-[10px] font-mono text-cyan-300 uppercase font-semibold block">
                    Discovered AI Tools
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {discoveredTools.map((tool) => {
                    const isSelected = selectedTools.includes(tool);
                    return (
                      <button
                        key={`disc-${tool}`}
                        onClick={() => toggleTool(tool)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-[0.97] flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-navy-950 border border-cyan-400 shadow-md shadow-cyan-500/20'
                            : 'bg-cyan-950/30 text-cyan-200 hover:bg-cyan-900/40 border border-cyan-500/30'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 fill-current" />}
                        <span>{tool}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Synthesize CTA & Status */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10">
              <button
                onClick={() => synthesizeArchitectures(selectedTools)}
                disabled={loading}
                className={`py-2 px-5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  !loading
                    ? 'bg-peach-500 hover:bg-peach-400 text-navy-950 shadow-md shadow-peach-500/20 active:scale-[0.98]'
                    : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                }`}
              >
                <span>{loading ? 'Synthesizing...' : selectedTools.length === 0 ? 'Refresh Top Combinations' : 'Synthesize Selected Tools'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {selectedTools.length === 0 ? (
                <span className="text-xs font-mono text-slate-400">Showing top pre-evaluated combinations</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTools([]);
                    synthesizeArchitectures([]);
                  }}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-peach-400 uppercase tracking-wider">
                {selectedTools.length === 0 
                  ? 'Recommended Workflows & Combinations'
                  : selectedTools.length === 1 
                    ? 'Standalone Service Opportunities' 
                    : 'Practical Workflows & Service Ideas'}
              </span>
              {loading && <span className="text-xs font-mono text-slate-400 animate-pulse">Evaluating tool capabilities...</span>}
            </div>

            {/* Results Grid */}
            {!isEntitled && (subscription?.status === 'expired' || subscription?.trial?.isExpired) ? (
              <div className="metal-panel-primary p-8 rounded-2xl border border-peach-500/30 text-center space-y-4 max-w-lg mx-auto my-6 shadow-2xl bg-slate-950/80">
                <div className="mx-auto w-12 h-12 rounded-full bg-peach-500/10 border border-peach-500/30 flex items-center justify-center text-peach-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-slate-100 uppercase tracking-wide">3-Day Free Trial Expired</h3>
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    Your free trial has ended. Subscribe to Opportunity OS Pro for ₹8/month to unlock real-time multi-tool combinations, service synthesis, and actionable monetization workflows.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openSubscriptionModal}
                  data-testid="paywall-combine-subscribe-btn"
                  className="btn-primary text-xs py-2.5 px-6 font-bold shadow-lg shadow-peach-500/30 inline-flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Unlock Pro Access (₹8/month)</span>
                </button>
              </div>
            ) : architectures.length === 0 && !loading ? (
              <div className="metal-panel-primary p-8 rounded-2xl border border-white/10 text-center space-y-2">
                <Layers className="h-8 w-8 text-slate-500 mx-auto" />
                <h3 className="font-display text-sm font-bold text-slate-200 uppercase">No Compatible Services Found</h3>
                <p className="font-sans text-xs text-slate-400 max-w-md mx-auto">
                  No service combinations met the quality threshold for this specific selection. Try selecting complementary tools (such as combining a text generator like Gemini with a design tool like Canva).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {architectures.map((arch) => (
                  <GlassCard
                    key={arch.id}
                    interactive
                    onClick={(e) => {
                      const payload = {
                        id: arch.id,
                        title: arch.title,
                        whatYouMake: arch.whatYouCouldSell,
                        whoPaysForIt: arch.whoPaysForIt,
                        estimatedEarnings: 'Free tier setup',
                        toolsYouUse: arch.toolsUsed,
                        technicalDetails: {
                          rawId: arch.id,
                          rawTitle: arch.title,
                          rawSource: 'tool_combination',
                        },
                      };
                      if (onOpenGuide) {
                        onOpenGuide(payload);
                      } else {
                        setSelectedArch({ card: arch, anchorEl: e.currentTarget });
                      }
                    }}
                    className="p-5 flex flex-col justify-between space-y-4 hover:border-peach-500/40 transition-all group min-w-0"
                  >
                    <div className="space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded bg-peach-500/20 text-peach-300 border border-peach-500/30 text-[10px] font-mono font-bold tracking-wider uppercase whitespace-normal break-words inline-block">
                          {arch.toolsUsed.length === 1 ? 'STANDALONE SERVICE' : 'TOOL COMBINATION'}
                        </span>
                        {arch.sourceLabel && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase ${
                            arch.sourceLabel.includes('discovery') || arch.sourceLabel.includes('discovery')
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-white/10 text-slate-300 border border-white/15'
                          }`}>
                            {arch.sourceLabel}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">What you could sell</span>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-peach-300 transition-colors leading-snug break-words">
                          {arch.whatYouCouldSell}
                        </h3>
                      </div>

                      {/* Tool Flow */}
                      <div className="p-3 bg-navy-950/80 rounded-xl border border-white/8 space-y-1 text-xs min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                          {arch.toolsUsed.length === 1 ? 'SERVICE EXECUTION' : 'HOW THE TOOLS WORK TOGETHER'}
                        </span>
                        <p className="font-sans text-peach-300 leading-relaxed text-xs break-words">{arch.toolFlowFormatted}</p>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-3 text-xs min-w-0">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Who pays for it</span>
                        <span className="font-bold text-slate-200 mt-0.5 block break-words">{arch.whoPaysForIt}</span>
                      </div>

                      <div className="pt-2">
                        <button type="button" className="w-full py-2.5 px-4 rounded-xl bg-peach-500 text-navy-950 font-mono font-bold uppercase tracking-wider text-xs shadow-md shadow-peach-500/20 flex items-center justify-center gap-2 group-hover:bg-peach-400 transition-colors cursor-pointer">
                          <span>Open Guide →</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Step-by-Step Guide Modal */}
      {selectedArch && (
        <OpportunityDetailModal
          card={{
            id: selectedArch.card.id,
            whatYouMake: selectedArch.card.whatYouCouldSell,
            whoPaysForIt: selectedArch.card.whoPaysForIt,
            estimatedEarnings: 'Free tier setup',
            toolsYouUse: selectedArch.card.toolsUsed,
            technicalDetails: {
              rawId: selectedArch.card.id,
              rawTitle: selectedArch.card.title,
              rawSource: 'tool_combination',
            },
          }}
          anchorEl={selectedArch.anchorEl}
          onClose={() => setSelectedArch(null)}
          onStartPlan={onStartPlan}
          backLabel="Back to Combine Tools"
        />
      )}
    </div>
  );
};
