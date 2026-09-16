import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Sliders, ShieldAlert, Award, Bookmark, BookmarkCheck, 
  ArrowRight, RefreshCw, Layers, Clock, TrendingUp, CheckCircle, 
  X, ExternalLink, Zap, Play, Search
} from 'lucide-react';
import { api, OpportunitiesResponse } from '../../services/api.js';
import { Opportunity } from '../../types/index.js';
import { GlassCard } from '../ui/GlassCard.js';

interface OpportunitiesScreenProps {
  onStartPlan?: (planId: string) => void;
}

export const OpportunitiesScreen: React.FC<OpportunitiesScreenProps> = ({ onStartPlan }) => {
  const [data, setData] = useState<OpportunitiesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [startingPlan, setStartingPlan] = useState<boolean>(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [filterSavedOnly, setFilterSavedOnly] = useState<boolean>(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, string>>({});

  const handleFeedback = async (oppId: string, rating: 'useful' | 'not_useful' | 'not_relevant') => {
    try {
      await api.submitFeedback({ sourceType: 'opportunity', sourceId: oppId, rating });
      setFeedbackStatus(prev => ({ ...prev, [oppId]: rating }));
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterSavedOnly) params.saved = 'true';
      if (filterDifficulty !== 'all') params.difficulty = filterDifficulty;

      const res = await api.getOpportunities(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [filterSavedOnly, filterDifficulty]);

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      await api.evaluateOpportunities();
      await loadOpportunities();
    } catch (err) {
      console.error('Failed to evaluate opportunities:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleToggleSave = async (e: React.MouseEvent, oppId: string) => {
    e.stopPropagation();
    try {
      const res = await api.saveOpportunity(oppId);
      if (res && res.opportunity) {
        setData(prev => {
          if (!prev) return null;
          const updatedOpps = prev.opportunities.map(o => o.id === oppId ? res.opportunity : o);
          return {
            ...prev,
            savedCount: updatedOpps.filter(o => o.saved).length,
            opportunities: updatedOpps
          };
        });
        if (selectedOpp && selectedOpp.id === oppId) {
          setSelectedOpp(res.opportunity);
        }
      }
    } catch (err) {
      console.error('Failed to toggle save state:', err);
    }
  };

  const handleStartActionPlan = async (oppId: string) => {
    try {
      setStartingPlan(true);
      const res = await api.generateActionPlan({ opportunityId: oppId });
      if (res && res.success && res.plan) {
        await api.startActionPlan(res.plan.id);
        if (onStartPlan) {
          onStartPlan(res.plan.id);
        }
      }
    } catch (err) {
      console.error('Failed to start action plan:', err);
    } finally {
      setStartingPlan(false);
    }
  };

  const [showFormula, setShowFormula] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const factors = [
    { name: 'Skill Match', weight: '25%', max: 25, key: 'skillMatch', desc: 'Evaluates your current skill proficiency.' },
    { name: 'Market Demand', weight: '20%', max: 20, key: 'marketDemand', desc: 'Assesses buyer intent and willingness to pay.' },
    { name: 'Tool Match', weight: '15%', max: 15, key: 'toolMatch', desc: 'Leverages tools you already access.' },
    { name: 'Startup Cost', weight: '15%', max: 15, key: 'startupCost', desc: 'Rewards ₹0 upfront capital execution.' },
    { name: 'Time to Demo', weight: '10%', max: 10, key: 'timeToDemo', desc: 'Target 1–2 days for a working prototype.' },
    { name: 'Learning Curve', weight: '5%', max: 5, key: 'learningCurve', desc: 'New skills required vs your tolerance.' },
    { name: 'Competition', weight: '5%', max: 5, key: 'competition', desc: 'Market saturation vs niche specialization.' },
    { name: 'Simplicity', weight: '5%', max: 5, key: 'simplicity', desc: 'Clarity of execution steps.' },
  ];

  const filteredOpportunities = (data?.opportunities || []).filter(opp => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return opp.title.toLowerCase().includes(q) || 
             (opp.summary || '').toLowerCase().includes(q) || 
             (opp.customerType || opp.target_customer || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 py-4 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-sans font-semibold text-peach-500 uppercase tracking-wider">Opportunity Catalog</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 pt-0.5">
            <Sparkles className="h-5 w-5 text-peach-500" />
            OPPORTUNITY PIPELINE
          </h1>
          <p className="font-sans text-xs text-slate-300 mt-0.5">
            Personalized opportunities matched to your profile skills, available tools, and zero-budget constraint.
          </p>
        </div>

        <button onClick={handleEvaluate} disabled={evaluating} className="btn-primary text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? 'animate-spin' : ''}`} />
          <span>{evaluating ? 'Scanning...' : 'Run Opportunity Scan'}</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard variant="secondary" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Evaluated</div>
            <div className="text-lg font-bold text-slate-100">{data?.count || 0} Opportunities</div>
          </div>
        </GlassCard>

        <GlassCard variant="secondary" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Top Match</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {data?.bestOpportunity ? `${data.bestOpportunity.score}% Fit` : '—'}
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="secondary" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bookmark className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Saved</div>
            <div className="text-lg font-bold text-slate-100">{data?.savedCount || 0} Items</div>
          </div>
        </GlassCard>

        <GlassCard variant="secondary" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Startup Cost</div>
            <div className="text-lg font-bold text-slate-100">₹0 Capital Needed</div>
          </div>
        </GlassCard>
      </div>

      {/* Formula Accordion */}
      <GlassCard variant="secondary" className="p-3.5 space-y-2">
        <button
          onClick={() => setShowFormula(!showFormula)}
          className="w-full flex items-center justify-between text-xs text-slate-300 font-semibold btn-ghost py-1"
        >
          <span className="flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            How recommendations are scored
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            {showFormula ? 'Hide scoring formula ▲' : 'See 8-factor formula ▼'}
          </span>
        </button>

        {showFormula && (
          <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 animate-fade-in">
            {factors.map((f, i) => (
              <div key={i} className="bg-slate-950/80 p-2.5 rounded-lg border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300 truncate">{f.name}</span>
                  <span className="font-mono text-indigo-400 font-bold">{f.weight}</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Filter Toolbar */}
      <GlassCard variant="floating" className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-slate-950/80 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-indigo-500">
          <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search opportunities by title, customer, or tools..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="bg-slate-950/80 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <button
            onClick={() => setFilterSavedOnly(!filterSavedOnly)}
            className={`btn-secondary text-xs py-1.5 px-3 ${
              filterSavedOnly 
                ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-semibold' 
                : ''
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>{filterSavedOnly ? 'Saved Only' : 'All Items'}</span>
          </button>
        </div>
      </GlassCard>

      {/* Opportunity Feed */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2 font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
          Loading personalized opportunities...
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <GlassCard variant="secondary" className="p-10 text-center space-y-3 max-w-lg mx-auto">
          <ShieldAlert className="h-8 w-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No Opportunities Found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery || filterSavedOnly || filterDifficulty !== 'all'
              ? 'Try adjusting your search filters.'
              : 'Click "Run Opportunity Scan" to generate personalized opportunities.'}
          </p>
          <button onClick={handleEvaluate} className="btn-primary text-xs py-2 px-4 mx-auto mt-2">
            Run Opportunity Scan
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpportunities.map((opp) => {
            const reqTools = opp.requiredTools || opp.required_tools || [];
            const earning = opp.earningPotential || opp.earning_potential || '₹5,000–₹25,000/month';
            const customer = opp.customerType || opp.customer_type || opp.target_customer || 'Local Businesses';

            return (
              <GlassCard
                key={opp.id}
                variant="secondary"
                interactive
                onClick={() => {
                  setSelectedOpp(opp);
                  setShowTechnicalDetails(false);
                }}
                className="p-5 space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold shadow-sm shadow-emerald-950/40">
                        {opp.score}% Fit for You
                      </span>
                      <span className="badge-tag badge-slate text-[10px]">
                        {opp.difficulty === 'Easy' ? 'Easy' : opp.difficulty}
                      </span>
                      <span className="badge-tag badge-slate text-[10px] flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 text-slate-400" />
                        ~{opp.timeToDemo || opp.time_to_demo || '1-2 days'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleToggleSave(e, opp.id)}
                      className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                        opp.saved 
                          ? 'bg-amber-950/40 border-amber-500 text-amber-300' 
                          : 'bg-slate-950/80 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                      title={opp.saved ? 'Unsave' : 'Save'}
                    >
                      {opp.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-peach-400 transition-colors">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {opp.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-navy-950/80 p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Possible Earnings</div>
                      <div className="font-semibold text-emerald-400 mt-0.5">{earning}</div>
                    </div>
                    <div className="bg-navy-950/80 p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Potential Customers</div>
                      <div className="font-semibold text-slate-300 mt-0.5 truncate">{customer}</div>
                    </div>
                  </div>

                  {reqTools.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Tools You'll Use</div>
                      <div className="flex flex-wrap gap-1.5">
                        {reqTools.map((tool: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-burgundy-900/60 border border-crimson-500/30 text-peach-400 text-[11px] font-medium">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-peach-500 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    See opportunity <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">₹0 to start</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Redesigned Glass Detail Modal */}
      {selectedOpp && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {selectedOpp.score}% Fit for You
                  </span>
                  <span className="badge-tag badge-slate text-xs">{selectedOpp.difficulty}</span>
                  <span className="badge-tag badge-slate text-xs">
                    Time to Demo: ~{selectedOpp.timeToDemo || selectedOpp.time_to_demo || '1-2 days'}
                  </span>
                  <span className="badge-tag badge-emerald text-xs">₹0 to start</span>
                </div>
                <h2 className="text-xl font-bold text-slate-100">{selectedOpp.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{selectedOpp.summary}</p>
              </div>

              <button
                onClick={() => setSelectedOpp(null)}
                className="btn-ghost p-1.5 text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-burgundy-900/40 border border-crimson-500/30 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-peach-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-peach-500" />
                Why This Fits You
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Uses tools you access (<strong>{((selectedOpp.requiredTools || selectedOpp.required_tools) || []).join(', ') || 'AI tools'}</strong>)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Matches your ₹0 upfront budget requirement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{selectedOpp.whyMatch || selectedOpp.why_match || 'Fits your current profile skills and goals.'}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 border-b border-white/10 pb-5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-peach-500" />
                What You'll Make & Deliver
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                {(selectedOpp.workflow || []).map((step: string, idx: number) => (
                  <React.Fragment key={idx}>
                    <div className="flex-1 bg-navy-950/80 p-3 rounded-xl border border-white/10 text-xs space-y-1 w-full">
                      <div className="text-[10px] font-mono text-peach-500 font-bold uppercase">Step {idx + 1}</div>
                      <div className="text-slate-200 font-medium">{step}</div>
                    </div>
                    {idx < (selectedOpp.workflow || []).length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-400 hidden sm:block shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-white/10 rounded-xl p-4 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Potential Customers</span>
                <div className="text-sm font-bold text-slate-200">
                  {selectedOpp.customerType || selectedOpp.customer_type || selectedOpp.target_customer || 'Small Businesses'}
                </div>
                <p className="text-xs text-slate-400">Businesses looking to save time using automation.</p>
              </div>

              <div className="bg-slate-950/80 border border-white/10 rounded-xl p-4 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Possible Earnings</span>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  {selectedOpp.earningPotential || selectedOpp.earning_potential || '₹5,000–₹25,000/month'}
                </div>
                <p className="text-xs text-slate-400">Based on standard freelance service pricing.</p>
              </div>
            </div>

            {/* Feedback Widget */}
            <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-medium">Was this recommendation useful?</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleFeedback(selectedOpp.id, 'useful')}
                  className={`btn-ghost text-xs border ${
                    feedbackStatus[selectedOpp.id] === 'useful'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'border-white/10'
                  }`}
                >
                  👍 Useful
                </button>
                <button
                  onClick={() => handleFeedback(selectedOpp.id, 'not_useful')}
                  className={`btn-ghost text-xs border ${
                    feedbackStatus[selectedOpp.id] === 'not_useful'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'border-white/10'
                  }`}
                >
                  👎 Not Useful
                </button>
                <button
                  onClick={() => handleFeedback(selectedOpp.id, 'not_relevant')}
                  className={`btn-ghost text-xs border ${
                    feedbackStatus[selectedOpp.id] === 'not_relevant'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'border-white/10'
                  }`}
                >
                  🚫 Not Relevant
                </button>
              </div>
            </div>

            {/* Progressive Technical Details Accordion */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="btn-ghost text-xs text-slate-400 w-full justify-between"
              >
                <span>{showTechnicalDetails ? 'Hide technical details ▲' : 'See score details & evidence ▼'}</span>
              </button>

              {showTechnicalDetails && (
                <div className="mt-3 space-y-4 bg-slate-950/90 p-4 rounded-xl border border-white/10 text-xs animate-fade-in">
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                      Transparent Score Breakdown
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {factors.map((f) => {
                        const breakdown = selectedOpp.scoreBreakdown || selectedOpp.score_breakdown || {};
                        const val = (breakdown as any)[f.key] || 0;
                        const pct = Math.round((val / f.max) * 100);

                        return (
                          <div key={f.key} className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5 space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-300">{f.name}</span>
                              <span className="font-mono text-indigo-400">{val} / {f.max} pts</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                              <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedOpp.discoveryId && (
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <span className="font-bold text-slate-300 block uppercase text-[10px]">Verification Evidence</span>
                      <p className="text-slate-400 font-mono text-[11px]">
                        Discovery ID: {selectedOpp.discoveryId} • Verification: {selectedOpp.evidence?.verificationStatus || 'verified'}
                      </p>
                      {selectedOpp.evidence?.discoveryUrl && (
                        <a href={selectedOpp.evidence.discoveryUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]">
                          {selectedOpp.evidence.discoveryUrl} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
              <button
                onClick={(e) => handleToggleSave(e, selectedOpp.id)}
                className={`btn-secondary text-xs ${selectedOpp.saved ? 'text-amber-400 border-amber-500/40' : ''}`}
              >
                {selectedOpp.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                <span>{selectedOpp.saved ? 'Saved' : 'Save'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartActionPlan(selectedOpp.id)}
                  disabled={startingPlan}
                  className="btn-primary text-xs py-2 px-5"
                >
                  <Play className={`h-3.5 w-3.5 ${startingPlan ? 'animate-spin' : ''}`} />
                  <span>{startingPlan ? 'Preparing plan...' : 'Start Your Plan'}</span>
                </button>

                <button onClick={() => setSelectedOpp(null)} className="btn-secondary text-xs py-2 px-3">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
