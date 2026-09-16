import React, { useState, useEffect } from 'react';
import {
  Layers,
  Wrench,
  Zap,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Info,
  Play,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { UserTool, ToolCombination } from '../../types/index.js';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { SpatialToolWeb } from '../ui/SpatialToolWeb.js';

interface CombineScreenProps {
  tools: UserTool[];
  onStartPlan?: (planId: string) => void;
}

export const CombineScreen: React.FC<CombineScreenProps> = ({ tools, onStartPlan }) => {
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    tools.slice(0, 4).map(t => t.id)
  );
  const [combinations, setCombinations] = useState<ToolCombination[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [filterSavedOnly, setFilterSavedOnly] = useState(false);
  const [filterZeroCostOnly, setFilterZeroCostOnly] = useState(false);
  const [filterPattern, setFilterPattern] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'synergy'>('score');

  const [showToolSelector, setShowToolSelector] = useState(true);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, string>>({});

  const handleFeedback = async (comboId: string, rating: 'useful' | 'not_useful' | 'not_relevant') => {
    try {
      await api.submitFeedback({ sourceType: 'combination', sourceId: comboId, rating });
      setFeedbackStatus(prev => ({ ...prev, [comboId]: rating }));
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const loadCombinations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCombinations();
      setCombinations(res.combinations || []);
      if (res.message && res.combinations.length === 0) {
        setNotice(res.message);
      }
    } catch (err: any) {
      console.error('Error loading combinations:', err);
      setError(err?.message || 'Failed to load tool combinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCombinations();
  }, []);

  const toggleTool = (id: string) => {
    setSelectedToolIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedToolIds(tools.map(t => t.id));
  };

  const handleClearSelection = () => {
    setSelectedToolIds([]);
  };

  const handleSelectFirst3 = () => {
    setSelectedToolIds(tools.slice(0, 3).map(t => t.id));
  };

  const handleGenerate = async (useSelectedOnly: boolean) => {
    try {
      setGenerating(true);
      setError(null);
      setNotice(null);

      const targetIds = useSelectedOnly ? selectedToolIds : undefined;
      if (useSelectedOnly && targetIds && targetIds.length < 2) {
        setError('Please select at least 2 tools to evaluate combinations.');
        setGenerating(false);
        return;
      }

      const res = await api.generateCombinations({ toolIds: targetIds });
      setCombinations(res.combinations || []);
      setNotice(res.message);
      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      console.error('Error generating combinations:', err);
      setError(err?.message || 'Failed to generate combinations');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSave = async (id: string) => {
    try {
      const res = await api.saveCombination(id);
      if (res.success) {
        setCombinations(prev =>
          prev.map(c => (c.id === id ? { ...c, saved: res.saved } : c))
        );
      }
    } catch (err: any) {
      console.error('Error toggling save:', err);
    }
  };

  const handleStartActionPlan = async (comboId: string) => {
    try {
      setStartingPlanId(comboId);
      const res = await api.generateActionPlan({ combinationId: comboId });
      if (res && res.success && res.plan) {
        await api.startActionPlan(res.plan.id);
        if (onStartPlan) {
          onStartPlan(res.plan.id);
        }
      }
    } catch (err: any) {
      console.error('Error starting action plan:', err);
      setError(err.message || 'Failed to start action plan');
    } finally {
      setStartingPlanId(null);
    }
  };

  const toggleBreakdown = (id: string) => {
    setExpandedBreakdowns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCombinations = combinations
    .filter(combo => {
      if (filterSavedOnly && !combo.saved) return false;
      if (filterZeroCostOnly && !combo.is_zero_cost) return false;
      if (filterPattern !== 'all' && combo.workflow_pattern !== filterPattern) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'synergy') return b.score_breakdown.capabilitySynergy - a.score_breakdown.capabilitySynergy;
      if (sortBy === 'time') return a.time_to_demo.localeCompare(b.time_to_demo);
      return 0;
    });

  const savedCount = combinations.filter(c => c.saved).length;
  const zeroCostCount = combinations.filter(c => c.is_zero_cost).length;
  const selectedToolNames = tools.filter(t => selectedToolIds.includes(t.id)).map(t => t.name);

  return (
    <div className="space-y-6 py-4 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-sans font-semibold text-peach-500 uppercase tracking-wider">
            Tool Combiner Engine
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5">
            <Layers className="h-5 w-5 text-peach-500" />
            COMBINE TOOLS
          </h1>
          <p className="font-sans text-xs text-slate-300 mt-0.5">
            Discover high-value workflows by synthesizing 2 or more of your accessible tools into zero-cost digital services.
          </p>
        </div>

        <button
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="btn-primary text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Synthesizing...' : 'Generate New Combinations'}</span>
        </button>
      </div>

      {/* 3D Capability Graph Banner */}
      <GlassCard variant="primary" className="p-6 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-peach-500" />
            <h3 className="font-display text-lg font-bold text-slate-200 uppercase tracking-wider">3D Capability Graph</h3>
          </div>
          <span className="badge-tag badge-peach font-sans">3D Spatial Synthesis</span>
        </div>

        <SpatialToolWeb toolNames={tools.map(t => t.name)} />
      </GlassCard>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-burgundy-900/40 border border-crimson-500/40 text-peach-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <Info className="h-4 w-4 text-peach-500 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tool Selector Section */}
      <GlassCard variant="secondary" className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-peach-500" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Select Tools to Combine ({selectedToolIds.length} of {tools.length} selected)
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button onClick={handleSelectFirst3} className="btn-ghost py-1 px-2.5 text-xs">Select First 3</button>
            <button onClick={handleSelectAll} className="btn-ghost py-1 px-2.5 text-xs">Select All</button>
            <button onClick={handleClearSelection} className="btn-ghost py-1 px-2.5 text-xs">Clear</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {tools.map(tool => {
            const isSelected = selectedToolIds.includes(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-burgundy-900/60 border-peach-500/80 text-slate-100 shadow-lg shadow-burgundy-900/50'
                    : 'bg-navy-950/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-1 w-full">
                  <span className="font-bold text-xs leading-tight line-clamp-1">{tool.name}</span>
                  <div className={`h-4 w-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                    isSelected ? 'bg-peach-500 text-navy-950 font-bold' : 'border border-slate-700'
                  }`}>
                    {isSelected && '✓'}
                  </div>
                </div>
                <span className="text-[10px] font-mono opacity-75">{tool.category}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 text-[11px]">
            Tip: Select 2 to 4 tools to generate a focused combination recipe.
          </span>
          <button
            onClick={() => handleGenerate(true)}
            disabled={generating || selectedToolIds.length < 2 || selectedToolIds.length > 4}
            className="btn-secondary text-xs py-1.5 px-4 disabled:opacity-40"
          >
            Combine Selected ({selectedToolIds.length}) Tools
          </button>
        </div>
      </GlassCard>

      {/* Filter Toolbar */}
      <GlassCard variant="floating" className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px] mr-2">
            Found: <strong className="text-slate-200">{filteredCombinations.length}</strong>
          </span>

          <button
            onClick={() => setFilterSavedOnly(!filterSavedOnly)}
            className={`btn-secondary text-xs py-1 px-2.5 ${
              filterSavedOnly ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-semibold' : ''
            }`}
          >
            ⭐ Saved ({savedCount})
          </button>

          <button
            onClick={() => setFilterZeroCostOnly(!filterZeroCostOnly)}
            className={`btn-secondary text-xs py-1 px-2.5 ${
              filterZeroCostOnly ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-semibold' : ''
            }`}
          >
            ₹0 Cost ({zeroCostCount})
          </button>

          <select
            value={filterPattern}
            onChange={e => setFilterPattern(e.target.value)}
            className="bg-navy-950/80 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:border-peach-500 focus:outline-none"
          >
            <option value="all">All Workflow Patterns</option>
            <option value="GENERATE_DESIGN">Generate ➔ Design</option>
            <option value="GENERATE_EDIT">Generate ➔ Edit Video</option>
            <option value="CAPTURE_PROCESS_RESPOND">Capture ➔ Process ➔ Respond</option>
            <option value="TRIGGER_AI_ACTION">Trigger ➔ AI ➔ Action</option>
            <option value="LOCAL_AI_DOCUMENT_OUTPUT">Local AI ➔ Doc Audit</option>
            <option value="EXTRACT_SYNTHESIZE_PUBLISH">Extract ➔ Briefing</option>
            <option value="MONITOR_ANALYZE_ALERT">Monitor ➔ Alert Bot</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-navy-950/80 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:border-peach-500 focus:outline-none"
          >
            <option value="score">Highest Score</option>
            <option value="synergy">Highest Synergy</option>
            <option value="time">Time to Demo</option>
          </select>
        </div>
      </GlassCard>

      {/* Combination Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 animate-spin text-peach-500" />
          Evaluating multi-tool synergy...
        </div>
      ) : filteredCombinations.length === 0 ? (
        <GlassCard variant="secondary" className="p-8 text-center max-w-xl mx-auto space-y-4 my-6">
          <Zap className="h-8 w-8 text-slate-600 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-200">No Matching Tool Combinations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combinations must score at least <strong>65/100</strong> and exhibit non-redundant capability synergy across distinct pipeline stages.
            </p>
          </div>
          <button
            onClick={() => {
              setFilterSavedOnly(false);
              setFilterZeroCostOnly(false);
              setFilterPattern('all');
              handleGenerate(false);
            }}
            className="btn-primary text-xs mx-auto"
          >
            Reset Filters & Evaluate All Tools
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {filteredCombinations.map((combo) => {
            const isBreakdownOpen = Boolean(expandedBreakdowns[combo.id]);
            return (
              <GlassCard key={combo.id} variant="secondary" interactive className="p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge-tag bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-mono text-[10px]">
                        {combo.workflow_pattern.replace(/_/g, ' ➔ ')}
                      </span>
                      {combo.is_zero_cost && (
                        <span className="badge-tag badge-emerald flex items-center gap-1 text-[10px]">
                          <DollarSign className="h-3 w-3" /> ₹0 Upfront Cost
                        </span>
                      )}
                      <span className="badge-tag bg-slate-900 text-slate-400 border border-white/10 text-[10px] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {combo.time_to_demo}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-100">{combo.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{combo.summary}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-indigo-400 font-mono">{combo.score}</span>
                        <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">
                        {combo.confidence} Confidence
                      </span>
                    </div>

                    <button
                      onClick={() => handleStartActionPlan(combo.id)}
                      disabled={startingPlanId === combo.id}
                      className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 border-emerald-500/50"
                    >
                      <Play className={`h-3.5 w-3.5 ${startingPlanId === combo.id ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{startingPlanId === combo.id ? 'Starting...' : 'Start Action Plan'}</span>
                    </button>

                    <button
                      onClick={() => handleToggleSave(combo.id)}
                      className={`btn-secondary p-2 ${
                        combo.saved ? 'bg-amber-950/40 border-amber-500 text-amber-300' : ''
                      }`}
                    >
                      {combo.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Capability Chain Pipeline */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    Capability Chain & Tool Handoff
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {combo.capability_chain.map((stage, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-slate-950/80 border border-white/10 rounded-xl p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-4 w-4 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] flex items-center justify-center font-mono">
                              {stage.stageIndex}
                            </span>
                            {stage.toolName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {stage.actionDescription}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Concrete Outcome & Monetization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Concrete Deliverable & Target Customer
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-snug">
                      {combo.concrete_outcome}
                    </p>
                    <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Buyer Persona:</span>
                      <strong className="text-slate-300">{combo.target_customer}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Monetization Hypothesis
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {combo.monetization_hypothesis.range}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {combo.monetization_hypothesis.pricingModel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {combo.monetization_hypothesis.basis}
                    </p>
                  </div>
                </div>

                {/* Feedback Widget */}
                <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Was this combination idea useful?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleFeedback(combo.id, 'useful')}
                      className={`btn-ghost text-xs border ${
                        feedbackStatus[combo.id] === 'useful'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'border-white/10'
                      }`}
                    >
                      👍 Useful
                    </button>
                    <button
                      onClick={() => handleFeedback(combo.id, 'not_useful')}
                      className={`btn-ghost text-xs border ${
                        feedbackStatus[combo.id] === 'not_useful'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'border-white/10'
                      }`}
                    >
                      👎 Not Useful
                    </button>
                    <button
                      onClick={() => handleFeedback(combo.id, 'not_relevant')}
                      className={`btn-ghost text-xs border ${
                        feedbackStatus[combo.id] === 'not_relevant'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'border-white/10'
                      }`}
                    >
                      🚫 Not Relevant
                    </button>
                  </div>
                </div>

                {/* Score Breakdown Accordion */}
                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => toggleBreakdown(combo.id)}
                    className="btn-ghost text-xs text-slate-400 w-full justify-between"
                  >
                    <span>{isBreakdownOpen ? 'Hide' : 'Inspect'} 8-Factor Score Breakdown & Rationale</span>
                    {isBreakdownOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isBreakdownOpen && (
                    <div className="mt-3 p-4 bg-slate-950/90 rounded-xl border border-white/10 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Tool Availability</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {combo.score_breakdown.userToolAvailability} / 20
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.userToolAvailability}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Capability Synergy</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {combo.score_breakdown.capabilitySynergy} / 20
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.capabilitySynergy}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Skill Fit</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {combo.score_breakdown.personalSkillFit} / 15
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.personalSkillFit}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">₹0 Feasibility</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {combo.score_breakdown.zeroCostFeasibility} / 10
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.zeroCostFeasibility}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
