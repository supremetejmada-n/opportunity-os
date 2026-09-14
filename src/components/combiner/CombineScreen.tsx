import React, { useState, useEffect } from 'react';
import {
  Layers,
  Wrench,
  CheckCircle2,
  Zap,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  DollarSign,
  Clock,
  Sparkles,
  Filter,
  Check,
  AlertCircle,
  HelpCircle,
  Info,
  Play
} from 'lucide-react';
import { UserTool, ToolCombination, WorkflowPattern } from '../../types/index.js';
import { api } from '../../services/api.js';

interface CombineScreenProps {
  tools: UserTool[];
  onStartPlan?: (planId: string) => void;
}

export const CombineScreen: React.FC<CombineScreenProps> = ({ tools, onStartPlan }) => {
  // State
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    tools.slice(0, 4).map(t => t.id)
  );
  const [combinations, setCombinations] = useState<ToolCombination[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters & Sorting
  const [filterSavedOnly, setFilterSavedOnly] = useState(false);
  const [filterZeroCostOnly, setFilterZeroCostOnly] = useState(false);
  const [filterPattern, setFilterPattern] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'synergy'>('score');

  // UI expand toggles
  const [showToolSelector, setShowToolSelector] = useState(true);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});

  // Load existing combinations on mount
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

  // Selection helpers
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

  // Generate combinations handler
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

      const res = await api.generateCombinations({
        toolIds: targetIds
      });

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

  // Save / Bookmark handler
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

  // Filtered & Sorted list
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

  return (
    <div className="space-y-6 py-2 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
            Multi-Tool Capability Studio
          </span>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Combine My Tools
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Given the tools you can actually access, what useful things can you create by combining 2–4 of them?
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerate(false)}
            disabled={generating || tools.length < 2}
            className="btn-primary text-xs flex items-center gap-2 py-2 px-3.5"
          >
            <Sparkles className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Evaluating Synergies...' : 'Evaluate All Combinations'}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <Info className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/40 border border-red-500/40 text-red-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tool Selector Section */}
      <div className="panel-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-indigo-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Tool Palette ({selectedToolIds.length} / {tools.length} Selected)
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleSelectFirst3}
              className="text-[11px] text-slate-400 hover:text-indigo-400 px-2 py-1 rounded bg-slate-900 border border-slate-800"
            >
              Preset: Top 3
            </button>
            <button
              onClick={handleSelectAll}
              className="text-[11px] text-slate-400 hover:text-indigo-400 px-2 py-1 rounded bg-slate-900 border border-slate-800"
            >
              Select All
            </button>
            <button
              onClick={handleClearSelection}
              className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800"
            >
              Clear
            </button>
            <button
              onClick={() => setShowToolSelector(!showToolSelector)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              {showToolSelector ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showToolSelector && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tools.map((t) => {
                const isSelected = selectedToolIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTool(t.id)}
                    className={`p-3 rounded-lg border text-left flex items-start justify-between transition-all ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/70 text-slate-100 shadow-sm shadow-indigo-950/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <h3 className="font-bold text-xs leading-snug">{t.name}</h3>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {t.category} • {t.access_type || 'Free'}
                      </span>
                    </div>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
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
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-medium py-1.5 px-3 rounded-md transition-colors disabled:opacity-40"
              >
                Combine Selected ({selectedToolIds.length}) Tools
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toolbar: Stats, Filters, Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px] mr-2">
            Found: <strong className="text-slate-200">{filteredCombinations.length}</strong>
          </span>

          <button
            onClick={() => setFilterSavedOnly(!filterSavedOnly)}
            className={`px-2.5 py-1 rounded-md border transition-all ${
              filterSavedOnly
                ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ⭐ Saved ({savedCount})
          </button>

          <button
            onClick={() => setFilterZeroCostOnly(!filterZeroCostOnly)}
            className={`px-2.5 py-1 rounded-md border transition-all ${
              filterZeroCostOnly
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ₹0 Upfront Cost ({zeroCostCount})
          </button>

          <select
            value={filterPattern}
            onChange={e => setFilterPattern(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none"
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
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none"
          >
            <option value="score">Highest Score</option>
            <option value="synergy">Highest Synergy</option>
            <option value="time">Time to Demo</option>
          </select>
        </div>
      </div>

      {/* Combinations List */}
      {loading ? (
        <div className="panel-card p-12 text-center space-y-3">
          <div className="h-7 w-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Evaluating multi-tool synergy and feasibility...</p>
        </div>
      ) : filteredCombinations.length === 0 ? (
        <div className="panel-card p-8 border border-slate-800/80 text-center max-w-xl mx-auto space-y-4 my-6">
          <Zap className="h-8 w-8 text-slate-600 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-200">No Matching Tool Combinations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combinations must score at least <strong>65/100</strong> and exhibit non-redundant capability synergy across distinct pipeline stages (e.g. Generation ➔ Design or Scraping ➔ AI analysis).
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => {
                setFilterSavedOnly(false);
                setFilterZeroCostOnly(false);
                setFilterPattern('all');
                handleGenerate(false);
              }}
              className="btn-primary text-xs"
            >
              Reset Filters & Evaluate All Tools
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredCombinations.map((combo) => {
            const isBreakdownOpen = Boolean(expandedBreakdowns[combo.id]);
            return (
              <div
                key={combo.id}
                className="panel-card p-6 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-5"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/60 pb-3.5">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge-tag bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-mono text-[10px]">
                        {combo.workflow_pattern.replace(/_/g, ' ➔ ')}
                      </span>
                      {combo.origin === 'discovery_derived' ? (
                        <span className="badge-tag bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[10px]">
                          Discovery-Derived
                        </span>
                      ) : (
                        <span className="badge-tag bg-purple-950/60 text-purple-300 border border-purple-500/30 text-[10px]">
                          Profile Recipe
                        </span>
                      )}
                      {combo.is_zero_cost ? (
                        <span className="badge-tag badge-emerald flex items-center gap-1 text-[10px]">
                          <DollarSign className="h-3 w-3" /> ₹0 Upfront Cost
                        </span>
                      ) : combo.startup_cost === -1 ? (
                        <span className="badge-tag bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px]">
                          Cost: Unverified
                        </span>
                      ) : (
                        <span className="badge-tag bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                          ~${combo.startup_cost} Upfront Cost
                        </span>
                      )}
                      <span className="badge-tag bg-slate-900 text-slate-400 border border-slate-800 text-[10px] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {combo.time_to_demo}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">{combo.title}</h3>
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
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-900/40"
                      title="Start 6-Phase Action Plan"
                    >
                      <Play className={`h-3.5 w-3.5 ${startingPlanId === combo.id ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{startingPlanId === combo.id ? 'Starting...' : 'Start Action Plan'}</span>
                    </button>

                    <button
                      onClick={() => handleToggleSave(combo.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        combo.saved
                          ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title={combo.saved ? 'Remove from Saved' : 'Save Combination'}
                    >
                      {combo.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Capability Chain Visualization */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    Capability Chain & Tool Handoff
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {combo.capability_chain.map((stage, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1 relative"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-4 w-4 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] flex items-center justify-center font-mono">
                              {stage.stageIndex}
                            </span>
                            {stage.toolName}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {stage.accessStatus === 'already_have'
                              ? 'Owned'
                              : stage.accessStatus === 'free_to_obtain'
                              ? 'Free Tool'
                              : stage.accessStatus === 'requires_paid_access'
                              ? 'Paid Tool'
                              : 'Unverified Access'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {stage.actionDescription}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deliverable & Monetization Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3.5 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Concrete Deliverable & Target Customer
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-snug">
                      {combo.concrete_outcome}
                    </p>
                    <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Buyer Persona:</span>
                      <strong className="text-slate-300">{combo.target_customer}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3.5 space-y-1.5">
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

                {/* Execution Steps */}
                {combo.workflow_steps && combo.workflow_steps.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Execution Blueprint
                    </span>
                    <ol className="space-y-1 text-xs text-slate-300">
                      {combo.workflow_steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-mono text-[11px] shrink-0">{stepIdx + 1}.</span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* 8-Factor Score Breakdown Accordion */}
                <div className="pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => toggleBreakdown(combo.id)}
                    className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors font-medium"
                  >
                    {isBreakdownOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>{isBreakdownOpen ? 'Hide' : 'Inspect'} 8-Factor Score Breakdown & Rationale</span>
                  </button>

                  {isBreakdownOpen && (
                    <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
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

                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
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

                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
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

                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Outcome Usefulness</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {combo.score_breakdown.outcomeUsefulness} / 15
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.outcomeUsefulness}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
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

                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Simplicity</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {combo.score_breakdown.executionSimplicity} / 10
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.executionSimplicity}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Time to Demo</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {combo.score_breakdown.timeToDemo} / 5
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.timeToDemo}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Monetization Potential</span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {combo.score_breakdown.customerMonetizationPotential} / 5
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {combo.score_breakdown.reasoning?.customerMonetizationPotential}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
