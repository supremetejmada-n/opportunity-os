import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Wrench, 
  TrendingUp
} from 'lucide-react';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { MetalText } from 'metal-fx';
import { 
  translateOpportunityToVector, 
  deduplicateVectors, 
  deduplicateItems,
  UserFacingVector 
} from '../../utils/UserFacingViewModel.js';
import { OpportunityDetailModal } from '../widgets/OpportunityDetailModal.js';

import { NavTab } from '../layout/Navbar.js';
import { useSubscription } from '../../context/SubscriptionContext.js';

interface OpportunitiesScreenProps {
  tools?: any[];
  skills?: any[];
  onNavigateTab?: (tab: NavTab) => void;
  onStartPlan?: (id: string) => void;
  onOpenGuide?: (card: any) => void;
  dataVersion?: number;
}

export const OpportunitiesScreen: React.FC<OpportunitiesScreenProps> = ({ 
  tools = [], 
  skills = [], 
  onNavigateTab, 
  onStartPlan, 
  onOpenGuide,
  dataVersion 
}) => {
  const { isEntitled, subscription, openSubscriptionModal } = useSubscription();
  const [rawOpps, setRawOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVector, setSelectedVector] = useState<{ card: UserFacingVector; anchorEl: HTMLElement } | null>(null);

  const hasProfileSetup = (tools && tools.length > 0) || (skills && skills.length > 0);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await api.getOpportunities();
      const items = res.opportunities || [];
      setRawOpps(deduplicateItems(items));
    } catch (err) {
      console.error('Failed to load ways to earn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [dataVersion, tools.length, skills.length]);

  const vectors: UserFacingVector[] = deduplicateItems(
    deduplicateVectors(
      rawOpps
        .map(translateOpportunityToVector)
        .filter((vec): vec is UserFacingVector => vec !== null)
    )
  );

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-peach-400 uppercase tracking-wider">SERVICE IDEAS</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5 leading-snug sm:leading-normal">
            <Sparkles className="h-6 w-6 text-peach-500" />
            Ways to Earn
          </h1>
          <p className="font-sans text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            Ready-to-sell service ideas matched to your free tools and skills.
          </p>
        </div>
      </div>

      {/* Grid or Onboarding Empty State */}
      {!hasProfileSetup && vectors.length === 0 && !loading ? (
        <div className="metal-panel-primary p-8 rounded-2xl border border-white/10 text-center space-y-4 max-w-lg mx-auto my-8 shadow-xl">
          <div className="mx-auto w-12 h-12 rounded-full bg-peach-500/10 border border-peach-500/30 flex items-center justify-center text-peach-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-slate-100 uppercase tracking-wide">No Ways to Earn Yet</h3>
            <p className="font-sans text-xs text-slate-300 leading-relaxed">
              Add your tools and skills in your profile to discover personalized service ideas and earning opportunities.
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="btn-primary text-xs py-2.5 px-5 font-bold shadow-lg shadow-peach-500/30 inline-flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Set Up Your Profile →</span>
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-navy-950/60 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : !isEntitled && (subscription?.status === 'expired' || subscription?.trial?.isExpired) ? (
        <div className="metal-panel-primary p-8 rounded-2xl border border-peach-500/30 text-center space-y-4 max-w-lg mx-auto my-8 shadow-2xl bg-slate-950/80">
          <div className="mx-auto w-12 h-12 rounded-full bg-peach-500/10 border border-peach-500/30 flex items-center justify-center text-peach-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-slate-100 uppercase tracking-wide">3-Day Free Trial Expired</h3>
            <p className="font-sans text-xs text-slate-300 leading-relaxed">
              Your free trial has ended. Subscribe to Opportunity OS Pro for ₹8/month to unlock personalized service ideas, monetization blueprints, and actionable client workflows.
            </p>
          </div>
          <button
            type="button"
            onClick={openSubscriptionModal}
            data-testid="paywall-subscribe-btn"
            className="btn-primary text-xs py-2.5 px-6 font-bold shadow-lg shadow-peach-500/30 inline-flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Unlock Pro Access (₹8/month)</span>
          </button>
        </div>
      ) : vectors.length === 0 ? (
        <div className="text-center py-12 bg-navy-950/40 rounded-2xl border border-white/10 p-6">
          <p className="text-slate-300 font-sans text-sm">No service ideas found right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {vectors.map((vector) => (
            <GlassCard
              key={vector.id}
              interactive
              onClick={(e) => {
                if (onOpenGuide) {
                  onOpenGuide(vector);
                } else {
                  setSelectedVector({ card: vector, anchorEl: e.currentTarget });
                }
              }}
              className="p-5 flex flex-col justify-between space-y-4 hover:border-peach-500/40 transition-all group min-w-0"
            >
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-peach-500/20 text-peach-300 border border-peach-500/30 text-[10px] font-mono font-bold tracking-wider uppercase whitespace-normal break-words">
                    {vector.sourceLabel || 'SERVICE IDEA'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold tracking-wider uppercase whitespace-nowrap">
                    Matches You
                  </span>
                </div>

                {/* What you make */}
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">What you make</span>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-peach-300 transition-colors leading-snug break-words">
                    {vector.whatYouMake}
                  </h3>
                </div>

                {/* Who pays for it & Estimated Earnings */}
                <div className={`grid ${vector.estimatedEarnings ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2 bg-navy-950/60 p-3 rounded-xl border border-white/8 text-xs min-w-0`}>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Who pays for it</span>
                    <span className="font-bold text-slate-200 mt-0.5 block break-words">{vector.whoPaysForIt}</span>
                  </div>
                  {vector.estimatedEarnings && (
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Estimated Earnings</span>
                      <span className="font-bold text-emerald-400 mt-0.5 block break-words">
                        <MetalText font="700 12px Inter, sans-serif" color="#34d399">
                          {vector.estimatedEarnings}
                        </MetalText>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-3 text-xs min-w-0">
                {/* Tools you use */}
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">Tools you use</span>
                  <span className="font-bold text-slate-200 block break-words">{vector.toolsFormatted}</span>
                </div>

                {/* How It Matches You */}
                <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/5 text-[11px] text-peach-300 font-sans min-w-0">
                  <span className="font-mono font-bold uppercase text-[10px] text-slate-400 block mb-0.5">How It Matches You</span>
                  <p className="break-words">{vector.howItMatchesYou}</p>
                </div>

                {/* CTA Action */}
                <div className="flex items-center justify-end pt-1">
                  <span className="text-xs font-mono font-bold text-peach-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Open Guide →
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Step-by-Step Guide Modal */}
      {selectedVector && (
        <OpportunityDetailModal
          card={selectedVector.card}
          anchorEl={selectedVector.anchorEl}
          onClose={() => setSelectedVector(null)}
          onStartPlan={onStartPlan}
          backLabel="Back to Ways to Earn"
        />
      )}
    </div>
  );
};
