import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, CheckCircle2, Circle, AlertCircle, AlertTriangle, Clock, 
  Sparkles, Copy, Check, ExternalLink, ChevronRight, ChevronLeft, 
  HelpCircle, RefreshCw, CheckCheck, Loader2, Wrench, ShieldCheck, 
  BookmarkCheck, MessageSquare, ArrowRight, X
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ActionPlan, ActionStep, ActionStepStatus } from '../../types/index.js';
import { synthesizePracticalGuidance, PracticalStepGuidance } from '../../utils/practicalGuidance.js';
import { GlassCard } from '../ui/GlassCard.js';

export interface PracticalGuideWorkspaceProps {
  planId?: string;
  card?: any;
  returnTabLabel?: string;
  onBack: () => void;
  onPlanUpdated?: () => void;
}

const buildCardPayload = (card: any) => {
  if (!card) return undefined;
  return {
    id: card.id,
    title: card.title || card.technicalDetails?.rawTitle || card.whatYouMake || 'AI Tool Workflow',
    summary: card.whatYouMake || card.description || card.summary || 'Custom AI tool combination workflow',
    description: card.whatYouMake || card.description || card.summary,
    concrete_outcome: card.whatYouMake || card.concrete_outcome || card.outcome,
    target_customer: card.whoPaysForIt || card.targetCustomer || card.customer_type,
    customer_type: card.whoPaysForIt || card.targetCustomer || card.customer_type,
    tools: card.toolsYouUse || card.toolsNeeded || card.toolsUsed || [],
    tool_names: card.toolsYouUse || card.toolsNeeded || card.toolsUsed || [],
    canonical_key: card.canonicalKey || card.technicalDetails?.canonicalKey || card.id,
    difficulty: card.difficulty || 'Medium',
    startup_cost: card.startupCost ?? -1,
    technicalDetails: card.technicalDetails
  };
};

export const PracticalGuideWorkspace: React.FC<PracticalGuideWorkspaceProps> = ({
  planId: initialPlanId,
  card,
  returnTabLabel = 'Ways to Earn',
  onBack,
  onPlanUpdated,
}) => {
  // Real backend plan state
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Active step index (0 .. N-1)
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Interactive step state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isBlockerOpen, setIsBlockerOpen] = useState(false);
  const [blockerText, setBlockerText] = useState('');
  const [mobileStepNavOpen, setMobileStepNavOpen] = useState(false);

  // Focus and scroll
  const topRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (Escape to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBlockerOpen) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isBlockerOpen]);

  // Load or generate action plan truthfully
  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (initialPlanId) {
        const res = await api.getActionPlanById(initialPlanId);
        if (res.plan) {
          setActivePlan(res.plan);
          // Restore user's last position from localStorage, or first incomplete
          const savedIndexStr = localStorage.getItem(`opp_os_step_${res.plan.id}`);
          if (savedIndexStr !== null && !isNaN(parseInt(savedIndexStr, 10))) {
            const savedIdx = parseInt(savedIndexStr, 10);
            if (savedIdx >= 0 && savedIdx < res.plan.steps.length) {
              setActiveStepIndex(savedIdx);
            } else {
              const firstIncomplete = res.plan.steps.findIndex(s => s.status !== 'completed');
              setActiveStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
            }
          } else {
            const firstIncomplete = res.plan.steps.findIndex(s => s.status !== 'completed');
            setActiveStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
          }
        } else {
          setError('Action plan could not be found.');
        }
      } else if (card?.id) {
        // Look up existing plan first to avoid creating duplicates
        const params: Record<string, string> = {};
        if (card.technicalDetails?.rawSource === 'tool_combination') {
          params.combinationId = card.id;
        } else {
          params.opportunityId = card.id;
        }

        const existingRes = await api.getActionPlans(params);
        if (existingRes.plans && existingRes.plans.length > 0) {
          const existingPlan = existingRes.plans[0];
          setActivePlan(existingPlan);
          const savedIndexStr = localStorage.getItem(`opp_os_step_${existingPlan.id}`);
          if (savedIndexStr !== null && !isNaN(parseInt(savedIndexStr, 10))) {
            const savedIdx = parseInt(savedIndexStr, 10);
            if (savedIdx >= 0 && savedIdx < existingPlan.steps.length) {
              setActiveStepIndex(savedIdx);
            } else {
              const firstIncomplete = existingPlan.steps.findIndex(s => s.status !== 'completed');
              setActiveStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
            }
          } else {
            const firstIncomplete = existingPlan.steps.findIndex(s => s.status !== 'completed');
            setActiveStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
          }
        } else {
          // Generate deterministic plan
          const cardPayload = buildCardPayload(card);
          const genParams: any = { cardPayload };
          if (card.technicalDetails?.rawSource === 'tool_combination') {
            genParams.combinationId = card.id;
          } else {
            genParams.opportunityId = card.id;
          }
          const genRes = await api.generateActionPlan(genParams);
          if (genRes.plan) {
            setActivePlan(genRes.plan);
            setActiveStepIndex(0);
          } else {
            setError('Could not generate an action plan for this opportunity.');
          }
        }
      } else {
        // Fallback: check current active plan
        const curr = await api.getCurrentActionPlan();
        if (curr.plan) {
          setActivePlan(curr.plan);
          const firstIncomplete = curr.plan.steps.findIndex(s => s.status !== 'completed');
          setActiveStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
        } else {
          setError('No opportunity selected or active plan found.');
        }
      }
    } catch (err: any) {
      console.error('[PracticalGuideWorkspace] Error loading plan:', err);
      setError(err.message || 'Failed to connect to plan engine.');
    } finally {
      setLoading(false);
    }
  }, [initialPlanId, card]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Persist current step index when it changes
  const handleSelectStep = (index: number) => {
    setActiveStepIndex(index);
    if (activePlan) {
      localStorage.setItem(`opp_os_step_${activePlan.id}`, String(index));
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileStepNavOpen(false);
  };

  const currentStep: ActionStep | undefined = activePlan?.steps[activeStepIndex];

  // Sync blocker text when step changes
  useEffect(() => {
    if (currentStep) {
      setBlockerText(currentStep.notes || '');
      setIsBlockerOpen(false);
    }
  }, [currentStep?.id]);

  // Synthesize rich, task-specific practical guidance
  const guidance: PracticalStepGuidance | null = useMemo(() => {
    if (!currentStep) return null;
    return synthesizePracticalGuidance(currentStep, {
      title: activePlan?.title || card?.title,
      outcome: activePlan?.objective || card?.whatYouMake || card?.outcome,
      whatYouMake: card?.whatYouMake,
      targetCustomer: card?.whoPaysForIt || card?.targetCustomer,
      whoPaysForIt: card?.whoPaysForIt,
      tools: currentStep.toolsNeeded && currentStep.toolsNeeded.length > 0 
        ? currentStep.toolsNeeded 
        : (card?.toolsYouUse || card?.toolsNeeded || ['ChatGPT', 'Canva']),
      difficulty: activePlan?.difficulty || card?.difficulty,
      startupCost: card?.startupCost ?? 0,
      userBudget: 0
    });
  }, [currentStep, activePlan, card]);

  // Mark step complete with explicit confirmation
  const handleMarkStepComplete = async () => {
    if (!activePlan || !currentStep || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // If plan is not_started, starting it changes to in_progress
      if (activePlan.status === 'not_started') {
        await api.startActionPlan(activePlan.id);
      }

      await api.updateActionStep(currentStep.id, {
        status: 'completed',
        notes: blockerText.trim() || undefined
      });

      // Refresh full plan from backend to sync real percentage & next step status
      const refreshed = await api.getActionPlanById(activePlan.id);
      if (refreshed.plan) {
        setActivePlan(refreshed.plan);
        setSuccessNotice(`Step ${currentStep.step_order} marked complete!`);
        setTimeout(() => setSuccessNotice(null), 3500);

        // Auto-advance to next step if not already at end
        if (activeStepIndex < refreshed.plan.steps.length - 1) {
          handleSelectStep(activeStepIndex + 1);
        }
        if (onPlanUpdated) onPlanUpdated();
      }
    } catch (err: any) {
      console.error('[PracticalGuideWorkspace] Error completing step:', err);
      setError(err.message || 'Failed to update step status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revert completed step to in_progress
  const handleReopenStep = async () => {
    if (!activePlan || !currentStep || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.updateActionStep(currentStep.id, {
        status: 'in_progress',
        notes: blockerText.trim() || undefined
      });

      const refreshed = await api.getActionPlanById(activePlan.id);
      if (refreshed.plan) {
        setActivePlan(refreshed.plan);
        if (onPlanUpdated) onPlanUpdated();
      }
    } catch (err: any) {
      console.error('[PracticalGuideWorkspace] Error reopening step:', err);
      setError(err.message || 'Failed to update step status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record / toggle blocker state
  const handleSaveBlocker = async () => {
    if (!activePlan || !currentStep || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const nextStatus: ActionStepStatus = blockerText.trim() ? 'blocked' : 'in_progress';
      await api.updateActionStep(currentStep.id, {
        status: nextStatus,
        notes: blockerText.trim() || undefined
      });

      const refreshed = await api.getActionPlanById(activePlan.id);
      if (refreshed.plan) {
        setActivePlan(refreshed.plan);
        if (nextStatus === 'blocked') {
          setSuccessNotice('Blocker recorded. Review the recovery troubleshooting instructions below.');
        } else {
          setSuccessNotice('Blocker resolved. Step restored to In Progress.');
          setIsBlockerOpen(false);
        }
        setTimeout(() => setSuccessNotice(null), 4000);
        if (onPlanUpdated) onPlanUpdated();
      }
    } catch (err: any) {
      console.error('[PracticalGuideWorkspace] Error saving blocker:', err);
      setError(err.message || 'Failed to record blocker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final review & plan completion
  const handleCompleteEntirePlan = async () => {
    if (!activePlan || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.completeActionPlan(activePlan.id);
      if (res.plan) {
        setActivePlan(res.plan);
        setSuccessNotice('🎉 Entire Opportunity Plan Completed! Real learnings saved to your Progress Tracker.');
        if (onPlanUpdated) onPlanUpdated();
      }
    } catch (err: any) {
      console.error('[PracticalGuideWorkspace] Error completing entire plan:', err);
      setError(err.message || 'Failed to complete plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInput = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2200);
  };

  const toggleChecklist = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Computed metrics
  const totalSteps = activePlan?.steps.length || 0;
  const completedCount = activePlan?.steps.filter(s => s.status === 'completed').length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const isFinalStep = activeStepIndex === totalSteps - 1;
  const allStepsCompleted = totalSteps > 0 && completedCount === totalSteps;

  return (
    <div ref={topRef} className="w-full min-h-[calc(100vh-80px)] flex flex-col bg-[#070a0f] text-slate-100 font-sans pb-16">
      {/* =========================================================================
          TOP HEADER: Dedicated focused execution bar
          ========================================================================= */}
      <div className="sticky top-0 z-30 w-full bg-[#0a0e17]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5 shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Back button & Opportunity Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label={`Return to ${returnTabLabel}`}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-semibold transition-all flex items-center gap-2 active:scale-95 cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>← Back to {returnTabLabel}</span>
            </button>

            <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />

            <div className="min-w-0 truncate">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-peach-400 font-bold shrink-0">
                  EXECUTION WORKSPACE
                </span>
                <span className="text-[10px] font-mono text-slate-500">•</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.2 rounded-full shrink-0 flex items-center gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Saved in Workspace
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-100 truncate font-display">
                {activePlan?.title || card?.title || 'Step-by-Step Practical Guide'}
              </h1>
            </div>
          </div>

          {/* Right: Progress Indicator & Plan Status */}
          <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs font-mono font-bold text-peach-400">
                  {completedCount} of {totalSteps} Completed
                </span>
                <span className="text-xs font-mono text-slate-400">({progressPercent}%)</span>
              </div>
              {/* Progress track */}
              <div className="w-36 sm:w-48 h-2 bg-navy-950 rounded-full border border-white/10 overflow-hidden mt-1">
                <div 
                  className="h-full bg-gradient-to-r from-peach-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="shrink-0">
              {activePlan?.status === 'completed' ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-mono font-bold uppercase flex items-center gap-1.5">
                  <CheckCheck className="h-3 w-3" />
                  Completed
                </span>
              ) : activePlan?.status === 'in_progress' ? (
                <span className="px-2.5 py-1 rounded-full bg-peach-500/20 text-peach-300 border border-peach-500/40 text-[11px] font-mono font-bold uppercase flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-peach-400 animate-pulse" />
                  In Progress
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/15 text-[11px] font-mono font-bold uppercase">
                  Not Started
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toast / Notices */}
        {successNotice && (
          <div className="mt-2 py-1.5 px-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center justify-between max-w-7xl mx-auto animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              {successNotice}
            </span>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-2 py-1.5 px-3 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-medium flex items-center justify-between max-w-7xl mx-auto">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              {error}
            </span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="h-8 w-8 text-peach-400 animate-spin" />
          <p className="text-sm font-mono text-slate-400">Loading your practical guidance plan...</p>
        </div>
      ) : !activePlan ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Plan Not Available</h2>
          <p className="text-xs text-slate-300">
            {error || 'Unable to load plan. Please return to Ways to Earn and reselect the opportunity.'}
          </p>
          <button onClick={onBack} className="btn-primary text-xs py-2 px-5">
            ← Return to {returnTabLabel}
          </button>
        </div>
      ) : (
        /* =========================================================================
            3-COLUMN WORKSPACE: Left Nav | Main Step Guide | Right Context
            ========================================================================= */
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* -----------------------------------------------------------------------
              LEFT PANEL: Ordered Steps with Honest States (col-span-3)
              ----------------------------------------------------------------------- */}
          <div className="lg:col-span-3 space-y-3">
            {/* Mobile accordion toggle */}
            <div className="lg:hidden flex items-center justify-between p-3 rounded-xl bg-navy-950/80 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-peach-400">
                  Step {activeStepIndex + 1} of {totalSteps}:
                </span>
                <span className="text-xs text-slate-200 font-medium truncate max-w-[180px]">
                  {currentStep?.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileStepNavOpen(!mobileStepNavOpen)}
                className="text-xs font-mono text-peach-400 underline"
              >
                {mobileStepNavOpen ? 'Hide Steps' : 'View All Steps'}
              </button>
            </div>

            <div className={`space-y-2 ${mobileStepNavOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between pb-1 px-1">
                <span className="text-[11px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  Plan Steps ({totalSteps})
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Click to inspect
                </span>
              </div>

              <div className="space-y-1.5">
                {activePlan.steps.map((step, idx) => {
                  const isSelected = idx === activeStepIndex;
                  const isCompleted = step.status === 'completed';
                  const isBlocked = step.status === 'blocked';
                  const isInProgress = step.status === 'in_progress';

                  return (
                    <button
                      key={step.id || idx}
                      type="button"
                      onClick={() => handleSelectStep(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? 'bg-peach-500/10 border-peach-500/50 shadow-md shadow-peach-500/10 text-white'
                          : 'bg-navy-950/40 hover:bg-navy-900/60 border-white/5 hover:border-white/15 text-slate-300'
                      }`}
                    >
                      {/* Status Icon */}
                      <div className="mt-0.5 shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : isBlocked ? (
                          <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
                        ) : isInProgress ? (
                          <div className="h-4 w-4 rounded-full border-2 border-peach-400 flex items-center justify-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-peach-400" />
                          </div>
                        ) : (
                          <Circle className="h-4 w-4 text-slate-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            {step.phase || `Step ${step.step_order}`}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {step.estimated_time}
                          </span>
                        </div>
                        <p className={`text-xs font-medium leading-snug line-clamp-2 ${isSelected ? 'text-slate-100 font-semibold' : 'text-slate-300'}`}>
                          {step.title}
                        </p>
                        
                        {/* Status Label badge */}
                        <div className="pt-0.5">
                          {isCompleted ? (
                            <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">
                              ✓ Completed
                            </span>
                          ) : isBlocked ? (
                            <span className="text-[9px] font-mono text-amber-400 uppercase font-bold">
                              ⚠ Blocked
                            </span>
                          ) : isInProgress ? (
                            <span className="text-[9px] font-mono text-peach-300 uppercase font-bold">
                              ● In Progress
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                              ○ Not Started
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plan Info Card */}
            <div className="p-4 rounded-xl bg-navy-950/30 border border-white/5 space-y-2 hidden lg:block">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Execution Guarantee
              </span>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Step-by-step guidance is strictly grounded in ₹0 tools. Advancing through steps never fabricates fake clients or testimonials.
              </p>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              MAIN WORKSPACE: Detailed Step Guidance (col-span-6)
              ----------------------------------------------------------------------- */}
          <div className="lg:col-span-6 space-y-6">
            {currentStep && guidance ? (
              <div className="space-y-6">
                
                {/* Step Header Block */}
                <div className="metal-panel-primary p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-peach-500/20 text-peach-300 border border-peach-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                        {guidance.phase}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {guidance.estimatedTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                        {guidance.costEstimate}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
                      {guidance.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                      {guidance.objective}
                    </p>
                  </div>
                </div>

                {/* Section 2: Starting Point / Prerequisites */}
                <GlassCard className="p-5 space-y-3 border-white/10">
                  <h3 className="text-xs font-mono uppercase font-bold text-peach-400 tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-peach-400" />
                    Starting Point & Prerequisites
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300 font-sans">
                    {guidance.startingPoint.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-peach-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                {/* Section 3: Exact Sequential Actions (Numbered) */}
                <GlassCard className="p-5 sm:p-6 space-y-4 border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="text-xs font-mono uppercase font-bold text-slate-200 tracking-wider flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-peach-400" />
                      Exact Step-by-Step Instructions
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Written for beginners
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {guidance.exactActions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-3.5 group">
                        <span className="h-6 w-6 rounded-lg bg-navy-900 border border-white/10 text-peach-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 group-hover:border-peach-500/40 transition-colors">
                          {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                          {action}
                        </p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Section 5: Exact Copy-Ready Inputs / Prompts / Templates */}
                {guidance.exactInputs && guidance.exactInputs.length > 0 && (
                  <div className="space-y-3">
                    {guidance.exactInputs.map((input, idx) => (
                      <div key={idx} className="rounded-2xl bg-black/60 border border-peach-500/30 overflow-hidden shadow-xl shadow-black/50 space-y-0">
                        {/* Prompt Header */}
                        <div className="bg-navy-950/80 px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase font-bold text-peach-400 bg-peach-500/20 px-2 py-0.5 rounded">
                              {input.type.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-slate-200 font-sans">
                              {input.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyInput(input.content, idx)}
                            className="px-3 py-1 rounded-lg bg-peach-500/20 hover:bg-peach-500/30 text-peach-300 border border-peach-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied! ✓</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Prompt</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Prompt Content */}
                        <div className="p-4 bg-navy-950/40 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                          {input.content}
                        </div>

                        {input.notes && (
                          <div className="bg-black/40 px-4 py-2 border-t border-white/5 text-[11px] font-sans text-slate-400 italic">
                            💡 {input.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 6: Concrete Illustrative Example (Truthfully Labeled) */}
                {guidance.concreteExample && (
                  <GlassCard className="p-5 space-y-2.5 border-white/10 bg-gradient-to-br from-navy-950/60 to-purple-950/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-purple-300">
                        Illustrative Reference Example
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 uppercase">
                        Sample Preview • Not Real Client
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 font-sans">
                      {guidance.concreteExample.headline}
                    </h4>

                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {guidance.concreteExample.details}
                    </p>

                    {guidance.concreteExample.previewText && (
                      <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                        {guidance.concreteExample.previewText}
                      </div>
                    )}
                  </GlassCard>
                )}

                {/* Section 8: Interactive Verification Checklist */}
                <GlassCard className="p-5 space-y-3.5 border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Verification Checklist
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Check each before completing
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {guidance.verificationChecklist.map((item, idx) => {
                      const itemKey = `${currentStep.id}_check_${idx}`;
                      const isChecked = !!checkedItems[itemKey];

                      return (
                        <label
                          key={idx}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-navy-950/40 hover:bg-navy-900/40 border border-white/5 transition-colors cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleChecklist(itemKey)}
                            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-navy-950 text-peach-500 focus:ring-peach-500/40 cursor-pointer"
                          />
                          <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                            {item}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Section 9: Common Problems & Recovery */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block px-1">
                    Common Problems & Simple Recovery
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {guidance.commonProblems.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-navy-950/50 border border-white/10 space-y-1 text-xs">
                        <span className="font-bold text-amber-300 block flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {item.problem}
                        </span>
                        <p className="text-slate-300 font-sans leading-relaxed pl-4">
                          ↳ {item.recovery}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 11 & 12: Completion Condition & Next Step Link */}
                <div className="p-4 rounded-xl bg-navy-950/40 border border-white/10 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Completion Condition
                    </span>
                    <p className="text-slate-200 font-medium">
                      {guidance.completionCondition}
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Next-Step Connection
                    </span>
                    <p className="text-slate-300">
                      {guidance.nextStepConnection}
                    </p>
                  </div>
                </div>

                {/* ---------------------------------------------------------------
                    ACTION CONTROLS BAR: Prev | I'm Blocked | Mark Complete | Next
                    --------------------------------------------------------------- */}
                <div className="pt-2 border-t border-white/10 space-y-3">
                  
                  {/* Blocker Form / Drawer (if open) */}
                  {isBlockerOpen && (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Record What's Blocking You
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsBlockerOpen(false)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                      <textarea
                        data-testid="blocker-textarea"
                        value={blockerText}
                        onChange={(e) => setBlockerText(e.target.value)}
                        placeholder="Describe what is blocking you (e.g. Canva tool limit, couldn't find client contact, export failed)..."
                        rows={2}
                        className="w-full p-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          data-testid="save-blocker-btn"
                          onClick={handleSaveBlocker}
                          disabled={isSubmitting}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs cursor-pointer active:scale-95"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Blocker & Mark Blocked'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Previous Step */}
                    <button
                      type="button"
                      onClick={() => handleSelectStep(activeStepIndex - 1)}
                      disabled={activeStepIndex === 0}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none border border-white/10 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous Step</span>
                    </button>

                    {/* Middle: I'm Blocked Action */}
                    <button
                      type="button"
                      data-testid="blocker-toggle-btn"
                      aria-label="Toggle step blocker"
                      onClick={() => setIsBlockerOpen(!isBlockerOpen)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
                        currentStep.status === 'blocked'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-300 border-white/10'
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{currentStep.status === 'blocked' ? 'Step is Blocked' : "I'm Blocked"}</span>
                    </button>

                    {/* Right: Mark Complete or Final Plan Completion */}
                    <div className="flex items-center gap-2">
                      {currentStep.status === 'completed' ? (
                        <button
                          type="button"
                          onClick={handleReopenStep}
                          disabled={isSubmitting}
                          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 text-xs font-mono font-semibold transition-all active:scale-95 cursor-pointer"
                        >
                          Reopen Step
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleMarkStepComplete}
                          disabled={isSubmitting}
                          className="btn-primary py-2.5 px-5 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-peach-500/25 active:scale-95 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark Step Complete ✓</span>
                            </>
                          )}
                        </button>
                      )}

                      {!isFinalStep && (
                        <button
                          type="button"
                          onClick={() => handleSelectStep(activeStepIndex + 1)}
                          className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono font-semibold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Final Plan Completion Banner (When on last step or all done) */}
                  {isFinalStep && (
                    <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-purple-950/40 to-navy-950 border border-peach-500/40 space-y-3 text-center">
                      <Sparkles className="h-6 w-6 text-peach-400 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-100 font-display">
                          {activePlan.status === 'completed'
                            ? 'Plan Successfully Finished!'
                            : 'Ready to Complete Your Opportunity Plan?'}
                        </h4>
                        <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                          Completing the plan verifies your real builder progress and fine-tunes your future matching recommendations.
                        </p>
                      </div>

                      {activePlan.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={handleCompleteEntirePlan}
                          disabled={isSubmitting}
                          className="btn-primary py-3 px-8 font-mono font-bold text-xs uppercase tracking-wider mx-auto flex items-center gap-2 cursor-pointer shadow-xl shadow-peach-500/30"
                        >
                          <CheckCheck className="h-4 w-4" />
                          <span>Complete & Review Entire Plan ✓</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ) : null}
          </div>

          {/* -----------------------------------------------------------------------
              RIGHT PANEL: Context, Tools & Prerequisites (col-span-3)
              ----------------------------------------------------------------------- */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Required Tools Widget */}
            <GlassCard className="p-4 space-y-3 border-white/10">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Wrench className="h-3 w-3 text-peach-400" />
                Required Tools
              </span>

              <div className="space-y-2">
                {guidance?.specificTools.map((tool, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{tool.name}</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold">
                        {tool.accessNote}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-tight">
                      {tool.purpose}
                    </p>
                    <p className="text-[10px] font-mono text-peach-300/80 pt-0.5">
                      → {tool.actionWorkflow}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Target Deliverable Summary */}
            <GlassCard className="p-4 space-y-2.5 border-white/10">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
                Deliverable Overview
              </span>
              <div className="space-y-1 text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">What You Make</span>
                <p className="text-slate-200 font-medium">
                  {card?.whatYouMake || activePlan.objective}
                </p>
              </div>

              <div className="space-y-1 text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Who Pays For It</span>
                <p className="text-slate-200 font-medium">
                  {card?.whoPaysForIt || card?.targetCustomer || 'Local small businesses'}
                </p>
              </div>

              <div className="space-y-1 text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Startup Cost</span>
                <p className="text-emerald-400 font-mono font-bold">
                  {card?.startupCost === 0 || card?.startupCost === undefined ? '₹0 Upfront' : `₹${card.startupCost}`}
                </p>
              </div>
            </GlassCard>

            {/* Notes & Blocker Log Widget */}
            <GlassCard className="p-4 space-y-2 border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3 text-peach-400" />
                  Your Step Notes
                </span>
                {currentStep?.notes && (
                  <span className="text-[9px] font-mono text-emerald-400">Saved</span>
                )}
              </div>

              <textarea
                value={blockerText}
                onChange={(e) => setBlockerText(e.target.value)}
                onBlur={handleSaveBlocker}
                placeholder="Add personal notes, test results, or links for this step..."
                rows={3}
                className="w-full p-2 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-peach-500/50 font-sans"
              />
              <span className="text-[9px] font-mono text-slate-500 block">
                Notes auto-save when clicking away.
              </span>
            </GlassCard>

            {/* Quick Return Link */}
            <button
              type="button"
              onClick={onBack}
              className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all text-center block cursor-pointer"
            >
              ← Back to {returnTabLabel}
            </button>

          </div>

        </div>
      )}
    </div>
  );
};
