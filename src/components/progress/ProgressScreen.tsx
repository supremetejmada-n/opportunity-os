import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Eye,
  Bookmark,
  Play,
  Video,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  Pause,
  Trash2,
  ExternalLink,
  PlusCircle,
  RotateCcw,
  Check,
  MessageSquare
} from 'lucide-react';
import {
  ProgressMetrics,
  ActionPlan,
  ActionStepStatus,
  ProgressLog,
  ProgressResultType,
  ProgressOutcome
} from '../../types/index.js';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { SpatialProgressRing } from '../ui/SpatialProgressRing.js';

interface ProgressScreenProps {
  metrics: ProgressMetrics;
  onRefreshMetrics?: () => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ metrics, onRefreshMetrics }) => {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);

  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);

  const [logFormOpen, setLogFormOpen] = useState<boolean>(false);
  const [formResultType, setFormResultType] = useState<ProgressResultType>('demo_created');
  const [formOutcome, setFormOutcome] = useState<ProgressOutcome>('positive');
  const [formValue, setFormValue] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formEvidence, setFormEvidence] = useState<string>('');
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [learningProfile, setLearningProfile] = useState<any>(null);
  const [rebuildingLearning, setRebuildingLearning] = useState<boolean>(false);

  const [activeStepNoteId, setActiveStepNoteId] = useState<string | null>(null);
  const [stepNoteText, setStepNoteText] = useState<string>('');

  const loadLearningProfile = async () => {
    try {
      const res = await api.getLearningProfile();
      if (res && res.profile) {
        setLearningProfile(res.profile);
      }
    } catch (err) {
      console.error('Error loading learning profile:', err);
    }
  };

  const handleRebuildLearning = async () => {
    try {
      setRebuildingLearning(true);
      const res = await api.rebuildLearningProfile();
      if (res && res.profile) {
        setLearningProfile(res.profile);
      }
    } catch (err) {
      console.error('Error rebuilding learning profile:', err);
    } finally {
      setRebuildingLearning(false);
    }
  };

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await api.getActionPlans();
      if (res.success && res.plans) {
        setPlans(res.plans);
        if (!selectedPlanId && res.plans.length > 0) {
          const active = res.plans.find(p => p.status === 'in_progress') || res.plans[0];
          setSelectedPlanId(active.id);
        }
      }
    } catch (err) {
      console.error('Failed to load action plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getProgressLogs();
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.error('Failed to load progress logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadPlans();
    loadLogs();
    loadLearningProfile();
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || null;

  const handleStartPlan = async (id: string) => {
    try {
      const res = await api.startActionPlan(id);
      if (res.success && res.plan) {
        setPlans(prev => prev.map(p => p.id === id ? res.plan : p));
        loadLogs();
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err) {
      console.error('Error starting plan:', err);
    }
  };

  const handlePausePlan = async (id: string) => {
    try {
      const res = await api.pauseActionPlan(id);
      if (res.success && res.plan) {
        setPlans(prev => prev.map(p => p.id === id ? res.plan : p));
      }
    } catch (err) {
      console.error('Error pausing plan:', err);
    }
  };

  const handleResumePlan = async (id: string) => {
    try {
      const res = await api.resumeActionPlan(id);
      if (res.success && res.plan) {
        setPlans(prev => prev.map(p => p.id === id ? res.plan : p));
      }
    } catch (err) {
      console.error('Error resuming plan:', err);
    }
  };

  const handleCompletePlan = async (id: string) => {
    try {
      const res = await api.completeActionPlan(id);
      if (res.success && res.plan) {
        setPlans(prev => prev.map(p => p.id === id ? res.plan : p));
        loadLogs();
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err) {
      console.error('Error completing plan:', err);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this action plan?')) return;
    try {
      const res = await api.deleteActionPlan(id);
      if (res.success) {
        setPlans(prev => prev.filter(p => p.id !== id));
        if (selectedPlanId === id) {
          const remaining = plans.filter(p => p.id !== id);
          setSelectedPlanId(remaining.length > 0 ? remaining[0].id : null);
        }
        loadLogs();
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  const handleUpdateStepStatus = async (stepId: string, status: ActionStepStatus, notes?: string) => {
    try {
      const res = await api.updateActionStep(stepId, { status, notes });
      if (res.success && res.step && selectedPlanId) {
        const updated = await api.getActionPlanById(selectedPlanId);
        if (updated.success && updated.plan) {
          setPlans(prev => prev.map(p => p.id === selectedPlanId ? updated.plan : p));
        }
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err) {
      console.error('Error updating step status:', err);
    }
  };

  const handleSaveStepNote = async (stepId: string) => {
    if (!stepNoteText.trim()) {
      setActiveStepNoteId(null);
      return;
    }
    await handleUpdateStepStatus(stepId, 'in_progress', stepNoteText);
    setActiveStepNoteId(null);
    setStepNoteText('');
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNotes.trim()) {
      setLogError('Please enter outcome notes or details.');
      return;
    }

    try {
      setSubmittingLog(true);
      setLogError(null);

      const numVal = formValue ? parseFloat(formValue) : undefined;
      const res = await api.logProgressResult({
        actionPlanId: selectedPlanId || undefined,
        resultType: formResultType,
        outcome: formOutcome,
        numericValue: isNaN(numVal as any) ? undefined : numVal,
        notes: formNotes.trim(),
        evidenceLink: formEvidence.trim() || undefined
      });

      if (res.success && res.log) {
        setLogs(prev => [res.log, ...prev]);
        setFormNotes('');
        setFormValue('');
        setFormEvidence('');
        setLogFormOpen(false);
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err: any) {
      console.error('Error logging result:', err);
      setLogError(err.message || 'Failed to submit result log');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const res = await api.deleteProgressLog(logId);
      if (res.success) {
        setLogs(prev => prev.filter(l => l.id !== logId));
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err) {
      console.error('Error deleting progress log:', err);
    }
  };

  const metricCards = [
    { label: 'Opportunities Viewed', value: metrics.opportunities_viewed, icon: Eye },
    { label: 'Opportunities Saved', value: metrics.opportunities_saved, icon: Bookmark },
    { label: 'Opportunities Attempted', value: metrics.opportunities_attempted, icon: Play },
    { label: 'Demos Built', value: metrics.demos_created, icon: Video },
    { label: 'Prospects Contacted', value: metrics.prospects_contacted, icon: Users },
    { label: 'Revenue Earned', value: `₹${metrics.revenue_earned}`, icon: DollarSign },
  ];

  const getPhaseBadge = (phase: string) => {
    switch (phase) {
      case 'LEARN': return 'bg-navy-900/80 text-peach-300 border-peach-500/30';
      case 'BUILD': return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40';
      case 'PORTFOLIO': return 'bg-burgundy-900/60 text-peach-400 border-crimson-500/40';
      case 'PROSPECT': return 'bg-amber-950/60 text-amber-400 border-amber-500/40';
      case 'OUTREACH': return 'bg-crimson-600/30 text-peach-300 border-crimson-500/50';
      case 'RESULT': return 'bg-burgundy-900/80 text-peach-400 border-peach-500/50';
      default: return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
      case 'in_progress': return 'bg-burgundy-900/80 text-peach-300 border-crimson-500/50';
      case 'paused': return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'skipped': return 'bg-slate-900 text-slate-500 border-slate-800';
      default: return 'bg-navy-950 text-slate-400 border-slate-800';
    }
  };

  const getOutcomeBadge = (outcome?: string) => {
    switch (outcome) {
      case 'positive': return 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30';
      case 'negative': return 'bg-crimson-600/20 text-crimson-400 border-crimson-500/30';
      default: return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const getLogTypeBadge = (type: ProgressResultType | string) => {
    switch (type) {
      case 'ACTION': return 'bg-slate-900 text-slate-300 border-slate-700';
      case 'DECISION': return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
      case 'LEARNING': return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      case 'RESULT': return 'bg-burgundy-900/60 text-peach-400 border-crimson-500/40';
      default: return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-sans font-semibold text-peach-500 uppercase tracking-wider">Execution Tracker</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5">
            <TrendingUp className="h-5 w-5 text-peach-500" />
            YOUR PLAN
          </h1>
          <p className="font-sans text-xs text-slate-300 mt-0.5">
            Follow your 6-phase plan step by step and track your real-world results.
          </p>
        </div>

        <button onClick={() => setLogFormOpen(!logFormOpen)} className="btn-primary text-xs">
          <PlusCircle className="h-4 w-4" />
          <span>{logFormOpen ? 'Close Logger' : 'Log Result'}</span>
        </button>
      </div>

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {metricCards.map((m, i) => {
          const Icon = m.icon;
          return (
            <GlassCard key={i} variant="secondary" className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="truncate">{m.label}</span>
                <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </div>
              <p className="text-lg font-bold text-slate-100 font-mono">{m.value}</p>
            </GlassCard>
          );
        })}
      </div>

      {/* Humanized Preferences Summary */}
      <GlassCard variant="secondary" className="p-4 border-purple-800/40 bg-purple-950/15 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-800/30 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="badge-tag bg-purple-950 text-purple-300 border-purple-500/30 font-mono text-[10px]">Preferences</span>
            <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
              What We've Learned About You
            </h3>
          </div>
          <button
            onClick={handleRebuildLearning}
            disabled={rebuildingLearning}
            className="btn-ghost text-xs py-1 px-2.5 text-purple-300 hover:text-purple-100"
          >
            <RotateCcw className={`h-3 w-3 ${rebuildingLearning ? 'animate-spin' : ''}`} />
            <span>{rebuildingLearning ? 'Updating...' : 'Update Recommendations'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Your Activity</span>
            <div className="text-base font-bold text-slate-100 font-mono">
              {learningProfile ? learningProfile.total_signals : 0} Activity Signals
            </div>
            <p className="text-[10px] text-slate-500">Learned from ratings, completed steps, and logged outcomes.</p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Preference Certainty</span>
            <div className="text-base font-bold text-purple-400 font-mono">
              {learningProfile ? (learningProfile.confidence_score * 100).toFixed(0) : 0}% Certainty
            </div>
            <p className="text-[10px] text-slate-500">Based on your activity patterns.</p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Learned Conclusion</span>
            <div className="text-xs font-semibold text-slate-200">
              {learningProfile && learningProfile.total_signals > 0 
                ? 'Prefers ₹0 cost & quick 1–2 day demo workflows' 
                : 'Neutral cold-start state (Profile defaults active)'}
            </div>
            <p className="text-[10px] text-slate-500">Adjusts match scores automatically.</p>
          </div>
        </div>
      </GlassCard>

      {/* Result Logging Form */}
      {logFormOpen && (
        <form onSubmit={handleSubmitLog} className="glass-panel-primary p-5 border-indigo-500/50 space-y-4 bg-indigo-950/20 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <PlusCircle className="h-4 w-4 text-indigo-400" />
              Log Verified Real-World Outcome
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Truthful execution record</span>
          </div>

          {logError && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{logError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Result Type</label>
              <select
                value={formResultType}
                onChange={e => setFormResultType(e.target.value as ProgressResultType)}
                className="w-full bg-slate-950/80 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="demo_created">Demo / Prototype Built</option>
                <option value="prospect_contacted">Prospect Contacted</option>
                <option value="response_received">Response Received</option>
                <option value="client_acquired">Client Acquired</option>
                <option value="revenue_earned">Revenue Earned (₹)</option>
                <option value="hours_spent">Execution Hours Spent</option>
                <option value="rejected">Rejected / No Deal</option>
                <option value="abandoned">Approach Abandoned</option>
                <option value="general_note">General Execution Note</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Outcome</label>
              <select
                value={formOutcome}
                onChange={e => setFormOutcome(e.target.value as ProgressOutcome)}
                className="w-full bg-slate-950/80 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="positive">Positive / Success</option>
                <option value="neutral">Neutral / Learning</option>
                <option value="negative">Negative / Rejection / Loss</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Value (₹, Count, or Hours)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 5000 or 1"
                value={formValue}
                onChange={e => setFormValue(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Execution Notes & Context *</label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Contacted 5 dental clinics on LinkedIn; received 1 positive reply asking for a demo."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Evidence Link (GitHub, Loom, Drive)</label>
              <input
                type="url"
                placeholder="https://..."
                value={formEvidence}
                onChange={e => setFormEvidence(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button type="button" onClick={() => setLogFormOpen(false)} className="btn-secondary text-xs py-1.5 px-3">
                Cancel
              </button>
              <button type="submit" disabled={submittingLog} className="btn-primary text-xs py-1.5 px-4">
                {submittingLog ? 'Saving Log...' : 'Record Outcome'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Section: Action Plans */}
      {loadingPlans ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">Loading action plans...</div>
      ) : plans.length === 0 ? (
        <GlassCard variant="secondary" className="p-10 text-center max-w-xl mx-auto space-y-4 my-6">
          <div className="h-12 w-12 rounded-full bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-100">No Action Plans Created Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Opportunity OS action plans provide a concrete 6-phase roadmap (Learn ➔ Build ➔ Portfolio ➔ Prospect ➔ Outreach ➔ Result).
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {/* Plan Selector */}
          {plans.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-slate-500 font-mono uppercase whitespace-nowrap">Your Plans:</span>
              {plans.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all active:scale-[0.97] flex items-center gap-2 ${
                    p.id === selectedPlanId
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="truncate max-w-[180px]">{p.title.replace('Action Plan: ', '')}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${getStatusBadge(p.status)}`}>
                    {p.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Active Plan Card */}
          {selectedPlan && (
            <GlassCard variant="primary" interactive className="p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStatusBadge(selectedPlan.status)}`}>
                      {selectedPlan.status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 text-slate-400 border border-white/10">
                      Difficulty: {selectedPlan.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 text-slate-400 border border-white/10 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      Est. Time: {selectedPlan.estimated_total_time}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-100">{selectedPlan.title}</h2>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{selectedPlan.objective}</p>
                </div>

                {/* 3D Spatial Progress Ring */}
                <div className="w-full sm:w-auto flex justify-center">
                  <SpatialProgressRing progressPercentage={selectedPlan.progress_percentage || 0} />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-2 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  {selectedPlan.status === 'not_started' && (
                    <button onClick={() => handleStartPlan(selectedPlan.id)} className="btn-primary text-xs bg-emerald-600 border-emerald-500/50">
                      <Play className="h-3.5 w-3.5" />
                      <span>Start Plan</span>
                    </button>
                  )}
                  {selectedPlan.status === 'in_progress' && (
                    <>
                      <button onClick={() => handlePausePlan(selectedPlan.id)} className="btn-secondary text-xs py-1.5 px-2.5">
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause</span>
                      </button>
                      <button onClick={() => handleCompletePlan(selectedPlan.id)} className="btn-primary text-xs bg-emerald-600 border-emerald-500/50 py-1.5 px-3">
                        <Check className="h-3.5 w-3.5" />
                        <span>Complete</span>
                      </button>
                    </>
                  )}
                  {selectedPlan.status === 'paused' && (
                    <button onClick={() => handleResumePlan(selectedPlan.id)} className="btn-primary text-xs py-1.5 px-3">
                      <Play className="h-3.5 w-3.5" />
                      <span>Resume</span>
                    </button>
                  )}
                </div>

                <button onClick={() => handleDeletePlan(selectedPlan.id)} className="btn-ghost p-1.5 text-slate-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* 6-Phase Step Roadmap */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  6-Phase Execution Roadmap
                </h3>

                <div className="space-y-3">
                  {selectedPlan.steps.map((step) => {
                    const isCompleted = step.status === 'completed';
                    const isInProgress = step.status === 'in_progress';
                    const isSkipped = step.status === 'skipped';
                    const isNoteEditing = activeStepNoteId === step.id;

                    return (
                      <div
                        key={step.id}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          isCompleted
                            ? 'bg-emerald-950/10 border-emerald-500/30'
                            : isInProgress
                            ? 'bg-slate-950/90 border-indigo-500/60 shadow-lg shadow-indigo-950/40'
                            : isSkipped
                            ? 'bg-slate-950/40 border-slate-900 opacity-60'
                            : 'bg-slate-950/70 border-white/5'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getPhaseBadge(step.phase)}`}>
                              {step.step_order}. {step.phase}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{step.title}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {step.estimated_time}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${getStatusBadge(step.status)}`}>
                              {step.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{step.description}</p>

                        {step.notes && !isNoteEditing && (
                          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 text-xs text-slate-300 flex items-start gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono text-slate-500 uppercase block">Step Note:</span>
                              <p className="text-slate-300">{step.notes}</p>
                            </div>
                          </div>
                        )}

                        {isNoteEditing && (
                          <div className="space-y-2 pt-1 animate-fade-in">
                            <textarea
                              rows={2}
                              value={stepNoteText}
                              onChange={e => setStepNoteText(e.target.value)}
                              placeholder="Add notes, links, or blocker feedback for this step..."
                              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500 focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setActiveStepNoteId(null)} className="btn-secondary text-[11px] py-1 px-2.5">
                                Cancel
                              </button>
                              <button onClick={() => handleSaveStepNote(step.id)} className="btn-primary text-[11px] py-1 px-3">
                                Save Note
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs">
                          <div className="flex items-center gap-1.5">
                            {!isCompleted ? (
                              <button
                                onClick={() => handleUpdateStepStatus(step.id, 'completed')}
                                className="btn-primary text-[11px] py-1 px-2.5 bg-emerald-600 border-emerald-500/40"
                              >
                                <Check className="h-3 w-3" />
                                <span>Mark Completed</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStepStatus(step.id, 'not_started')}
                                className="btn-ghost text-[11px] py-1 px-2"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reopen Step</span>
                              </button>
                            )}

                            {!isCompleted && !isSkipped && (
                              <button onClick={() => handleUpdateStepStatus(step.id, 'skipped')} className="btn-ghost text-[11px] py-1 px-2">
                                Skip Step
                              </button>
                            )}

                            {!isNoteEditing && (
                              <button
                                onClick={() => {
                                  setActiveStepNoteId(step.id);
                                  setStepNoteText(step.notes || '');
                                }}
                                className="btn-ghost text-[11px] py-1 px-2 text-indigo-400"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>{step.notes ? 'Edit Note' : 'Add Note'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Execution Logs Feed */}
      <GlassCard variant="secondary" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Real-World Execution Log Feed ({logs.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Verified outcomes</span>
        </div>

        {loadingLogs ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">Loading execution logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center space-y-2 bg-slate-950/60 rounded-xl border border-white/5">
            <Award className="h-7 w-7 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No execution events logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-white/5 flex flex-wrap items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 border border-white/10 text-indigo-300">
                      {log.result_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${getOutcomeBadge(log.outcome)}`}>
                      {log.outcome || 'neutral'}
                    </span>
                    {log.numeric_value !== undefined && log.numeric_value !== null && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-bold">
                        {log.result_type === 'revenue_earned' ? `₹${log.numeric_value}` : `${log.numeric_value}`}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 leading-relaxed">{log.notes}</p>

                  {log.evidence_link && (
                    <a
                      href={log.evidence_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline font-mono pt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Verified Evidence Asset
                    </a>
                  )}
                </div>

                <button onClick={() => handleDeleteLog(log.id)} className="btn-ghost p-1 text-slate-500 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
