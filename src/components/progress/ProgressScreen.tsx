import React, { useEffect, useState } from 'react';
import { TrendingUp, Play, Clock, Sparkles, Layers, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { MetalText } from 'metal-fx';
import { isTestDataItem, getHumanWhatYouMake } from '../../utils/UserFacingViewModel.js';
import { ActionPlan } from '../../types/index.js';

interface ProgressScreenProps {
  metrics?: any;
  onRefreshMetrics?: () => Promise<void>;
  onContinuePlan?: (id: string) => void;
  onNavigateTab?: (tab: 'opportunities' | 'combine') => void;
  dataVersion?: number;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  metrics,
  onRefreshMetrics,
  onContinuePlan,
  onNavigateTab,
  dataVersion,
}) => {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOtherPlans, setShowOtherPlans] = useState(false);
  const [showCompletedPlans, setShowCompletedPlans] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.getActionPlans();
      const validPlans = (res.plans || []).filter(
        p => !isTestDataItem(p.title) && !isTestDataItem(p.id)
      );
      setPlans(validPlans);
    } catch (err) {
      console.error('Failed to load active step-by-step guides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [dataVersion]);

  // Categorize plans truthfully based on actual status
  const inProgressPlans = plans.filter(p => p.status === 'in_progress');
  const savedPlans = plans.filter(p => p.status === 'not_started');
  const completedPlans = plans.filter(p => p.status === 'completed');

  const currentPlan = inProgressPlans[0] || null;
  const otherActivePlans = currentPlan ? inProgressPlans.filter(p => p.id !== currentPlan.id) : [];

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="border-b border-white/10 pb-4">
        <span className="text-[10px] font-mono font-bold text-peach-400 uppercase tracking-wider">YOUR ACTION PLAN</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5 leading-snug sm:leading-normal">
          <TrendingUp className="h-6 w-6 text-peach-500" />
          Step-by-Step Guide
        </h1>
        <p className="font-sans text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
          Follow simple, practical steps to build your first demo, find clients, and start earning.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-56 rounded-2xl bg-navy-950/60 border border-white/10 animate-pulse" />
        </div>
      ) : !currentPlan ? (
        /* Useful Empty State when no plan is currently in_progress */
        <div className="space-y-6">
          <div className="metal-panel-primary p-8 sm:p-10 rounded-2xl border border-white/10 text-center space-y-4">
            <Clock className="h-10 w-10 text-peach-400 mx-auto opacity-70" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">No Active Plan in Progress</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                Choose a service from <strong>Ways to Earn</strong> or <strong>Combine Tools</strong> to start your first step-by-step plan.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onNavigateTab && onNavigateTab('opportunities')}
                className="btn-primary py-2.5 px-5 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                <span>Explore Ways to Earn →</span>
              </button>
              <button
                onClick={() => onNavigateTab && onNavigateTab('combine')}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Layers className="h-4 w-4" />
                <span>Combine Tools →</span>
              </button>
            </div>
          </div>

          {/* Saved Unstarted Plans List */}
          {savedPlans.length > 0 && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Saved Plans ({savedPlans.length})
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ready to start</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedPlans.map((plan) => {
                  const whatYouMake = getHumanWhatYouMake(plan.title);
                  return (
                    <GlassCard key={plan.id} className="p-4 flex flex-col justify-between space-y-3 border-white/10 hover:border-peach-500/30">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-mono uppercase font-bold">
                          SAVED PLAN
                        </span>
                        <h4 className="font-display font-bold text-white text-sm">{whatYouMake}</h4>
                        <p className="text-slate-400 text-xs font-sans line-clamp-2">{plan.objective}</p>
                      </div>
                      <button
                        onClick={() => onContinuePlan && onContinuePlan(plan.id)}
                        className="btn-primary text-xs py-2 px-4 font-mono font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Plan →</span>
                      </button>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: Your Current Plan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-peach-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-peach-400" />
                Your Current Plan
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                Active Primary
              </span>
            </div>

            {(() => {
              const plan = currentPlan;
              const completedCount = plan.completed_steps_count || (plan.steps || []).filter((s: any) => s.status === 'completed').length;
              const totalSteps = plan.total_steps_count || plan.steps?.length || 6;
              const inProgressStep = plan.steps?.find(s => s.status === 'in_progress');
              const notStartedStep = plan.steps?.find(s => s.status === 'not_started');
              const activeStep = inProgressStep || notStartedStep || plan.steps?.[0];

              const currentStepTitle = completedCount === 0 && !inProgressStep
                ? `STEP 1: ${activeStep?.title || 'Get the tools'} (Not Started)`
                : `STEP ${activeStep?.step_order || 1}: ${activeStep?.title || 'Get the tools'}`;

              const whatYouMake = getHumanWhatYouMake(plan.title);
              const percent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

              return (
                <GlassCard
                  key={plan.id}
                  className="p-6 border-peach-500/40 shadow-2xl relative overflow-hidden space-y-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <span className="px-2.5 py-0.5 rounded bg-peach-500/20 text-peach-300 border border-peach-500/30 text-[10px] font-mono font-bold tracking-wider uppercase inline-block">
                        PRIMARY PLAN
                      </span>

                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
                        {whatYouMake}
                      </h2>

                      <p className="font-sans text-xs text-slate-300 leading-relaxed max-w-2xl">
                        {plan.objective}
                      </p>
                    </div>

                    <div className="shrink-0 pt-1">
                      <button
                        onClick={() => onContinuePlan && onContinuePlan(plan.id)}
                        className="w-full md:w-auto btn-primary py-3.5 px-6 font-bold text-navy-950 uppercase tracking-wider text-xs shadow-xl shadow-peach-500/30 border border-white/40 flex items-center justify-center gap-2.5 hover:scale-[1.03] active:scale-[0.97] transition-all whitespace-nowrap cursor-pointer"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Continue Plan →</span>
                      </button>
                    </div>
                  </div>

                  {/* Current Step Banner */}
                  <div className="bg-navy-950/80 p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-0.5">CURRENT STEP</span>
                      <span className="font-bold text-peach-300 block">{currentStepTitle}</span>
                    </div>

                    <div className="font-mono text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/8 shrink-0">
                      Est. Time: <span className="text-white font-bold">{activeStep?.estimated_time || '45m'}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase">OVERALL PROGRESS</span>
                      <span className="text-peach-400 font-bold">
                        <MetalText font="700 12px Inter, sans-serif" color="#ffaa8a">
                          {`${completedCount} / ${totalSteps} Steps Completed (${percent}%)`}
                        </MetalText>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-peach-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </GlassCard>
              );
            })()}
          </div>

          {/* SECTION 2: Other Active Plans (Collapsible) */}
          {otherActivePlans.length > 0 && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <button
                onClick={() => setShowOtherPlans(!showOtherPlans)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-navy-950/60 hover:bg-navy-950/90 border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              >
                <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Other Active Plans ({otherActivePlans.length})</span>
                </span>
                {showOtherPlans ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {showOtherPlans && (
                <div className="space-y-3 pt-1">
                  {otherActivePlans.map((plan) => {
                    const completedCount = plan.completed_steps_count || 0;
                    const totalSteps = plan.total_steps_count || 5;
                    const whatYouMake = getHumanWhatYouMake(plan.title);
                    return (
                      <GlassCard
                        key={plan.id}
                        className="p-4 flex items-center justify-between gap-4 hover:border-peach-500/30 transition-all text-xs"
                      >
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-mono uppercase font-bold">
                            SECONDARY PLAN
                          </span>
                          <h4 className="font-display font-bold text-white text-sm">{whatYouMake}</h4>
                          <p className="text-slate-400 text-[11px] font-mono">{completedCount} / {totalSteps} Steps</p>
                        </div>
                        <button
                          onClick={() => onContinuePlan && onContinuePlan(plan.id)}
                          className="btn-ghost px-4 py-2 text-xs font-mono font-bold text-peach-400 hover:text-white border border-white/10 hover:border-peach-500/40 rounded-xl cursor-pointer"
                        >
                          Open Plan →
                        </button>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Completed Plans (Collapsible) */}
          {completedPlans.length > 0 && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <button
                onClick={() => setShowCompletedPlans(!showCompletedPlans)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-navy-950/60 hover:bg-navy-950/90 border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              >
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Completed Plans ({completedPlans.length})</span>
                </span>
                {showCompletedPlans ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {showCompletedPlans && (
                <div className="space-y-3 pt-1">
                  {completedPlans.map((plan) => (
                    <GlassCard
                      key={plan.id}
                      className="p-4 flex items-center justify-between gap-4 border-emerald-500/20 text-xs"
                    >
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono uppercase font-bold">
                          COMPLETED
                        </span>
                        <h4 className="font-display font-bold text-white text-sm">{getHumanWhatYouMake(plan.title)}</h4>
                      </div>
                      <button
                        onClick={() => onContinuePlan && onContinuePlan(plan.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white text-xs font-mono cursor-pointer"
                      >
                        View Summary
                      </button>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
