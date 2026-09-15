import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Sliders, ShieldAlert, Award, Bookmark, BookmarkCheck, 
  ArrowRight, RefreshCw, Layers, Clock, TrendingUp, CheckCircle, AlertTriangle, 
  X, ExternalLink, Zap, Play
} from 'lucide-react';
import { api, OpportunitiesResponse } from '../../services/api.js';
import { Opportunity } from '../../types/index.js';

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
      const res = await api.evaluateOpportunities();
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

  const factors = [
    { name: 'Skill Match', weight: '25%', max: 25, key: 'skillMatch', desc: 'Evaluates your current skill proficiency and confidence scores.' },
    { name: 'Market Demand', weight: '20%', max: 20, key: 'marketDemand', desc: 'Assesses buyer intent, market need, and willingness to pay.' },
    { name: 'Tool Match', weight: '15%', max: 15, key: 'toolMatch', desc: 'Leverages free tools and resources you already own.' },
    { name: 'Startup Cost', weight: '15%', max: 15, key: 'startupCost', desc: 'Heavily rewards ₹0 upfront capital execution workflows.' },
    { name: 'Time to Demo', weight: '10%', max: 10, key: 'timeToDemo', desc: 'Target 1–2 days to build a working prototype.' },
    { name: 'Learning Curve', weight: '5%', max: 5, key: 'learningCurve', desc: 'New skills required vs your stated learning tolerance.' },
    { name: 'Competition', weight: '5%', max: 5, key: 'competition', desc: 'Evaluates market saturation vs niche specialization.' },
    { name: 'Simplicity', weight: '5%', max: 5, key: 'simplicity', desc: 'Clarity of execution steps and minimal moving parts.' },
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
    <div className="space-y-6 py-2 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">Phase 4 Engine</span>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            Opportunity Scoring Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalized, actionable earning opportunities scored using a transparent 8-factor weighted formula (0–100).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Evaluating Profile...' : 'Run Opportunity Scan'}
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="panel-card p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Evaluated</div>
            <div className="text-lg font-bold text-slate-100">{data?.count || 0} Opportunities</div>
          </div>
        </div>

        <div className="panel-card p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Top Match Score</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {data?.bestOpportunity ? `${data.bestOpportunity.score}/100` : '—'}
            </div>
          </div>
        </div>

        <div className="panel-card p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-md bg-amber-500/10 text-amber-400">
            <Bookmark className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Saved</div>
            <div className="text-lg font-bold text-slate-100">{data?.savedCount || 0} Items</div>
          </div>
        </div>

        <div className="panel-card p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-md bg-sky-500/10 text-sky-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Startup Cost</div>
            <div className="text-lg font-bold text-slate-100">₹0 Budget Limit</div>
          </div>
        </div>
      </div>

      {/* 8-Factor Transparent Formula Reference Banner */}
      <div className="panel-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            Transparent 8-Factor Weighted Scoring Architecture
          </h2>
          <span className="badge-tag badge-indigo">100 Total Points</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {factors.map((f, i) => (
            <div key={i} className="bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300 truncate">{f.name}</span>
                <span className="font-mono text-indigo-400 font-bold">{f.weight}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search opportunities by title, customer, tools..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <button
            onClick={() => setFilterSavedOnly(!filterSavedOnly)}
            className={`px-3 py-1.5 rounded border flex items-center gap-1.5 font-medium transition-colors ${
              filterSavedOnly 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            {filterSavedOnly ? 'Saved Only' : 'All Opportunities'}
          </button>
        </div>
      </div>

      {/* Opportunity Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
          Loading personalized opportunities...
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="panel-card p-10 text-center space-y-3 bg-slate-900/60 max-w-lg mx-auto">
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpportunities.map((opp) => {
            const reqTools = opp.requiredTools || opp.required_tools || [];
            const earning = opp.earningPotential || opp.earning_potential || '₹5,000–₹25,000/month';
            const customer = opp.customerType || opp.customer_type || opp.target_customer || 'Local Businesses';
            const breakdown = opp.scoreBreakdown || opp.score_breakdown;
            const origin = opp.origin || (opp.discoveryId ? 'discovery_derived' : 'template');
            const confidence = opp.confidence || 'Medium';

            return (
              <div
                key={opp.id}
                onClick={() => setSelectedOpp(opp)}
                className="panel-card p-5 space-y-4 hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top line: Score, Origin, Confidence & Save Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                        opp.score >= 85 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        opp.score >= 70 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {opp.score}/100 Match
                      </span>
                      {(opp.learningAdjustment || opp.learning_adjustment) ? (
                        <span className={`badge-tag text-[10px] ${
                          (opp.learningAdjustment || opp.learning_adjustment || 0) > 0 
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {(opp.learningAdjustment || opp.learning_adjustment || 0) > 0 ? `+${opp.learningAdjustment || opp.learning_adjustment}` : (opp.learningAdjustment || opp.learning_adjustment)} pts Learning
                        </span>
                      ) : null}
                      <span className={`badge-tag text-[10px] ${
                        origin === 'discovery_derived' ? 'badge-emerald' : 'badge-slate'
                      }`}>
                        {origin === 'discovery_derived' ? 'Discovery-Backed' : origin === 'profile_hypothesis' ? 'Profile Hypothesis' : 'Template'}
                      </span>
                      <span className={`badge-tag text-[10px] ${
                        confidence === 'High' ? 'badge-emerald' : confidence === 'Medium' ? 'badge-indigo' : 'badge-amber'
                      }`}>
                        {confidence} Confidence
                      </span>
                      <span className="badge-tag badge-slate text-[10px]">
                        {opp.difficulty}
                      </span>
                      <span className="badge-tag badge-slate text-[10px] flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 text-slate-400" />
                        {opp.timeToDemo || opp.time_to_demo || '1-2 days'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleToggleSave(e, opp.id)}
                      className={`p-1.5 rounded border transition-colors shrink-0 ${
                        opp.saved 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title={opp.saved ? 'Unsave opportunity' : 'Save opportunity'}
                    >
                      {opp.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {opp.summary}
                    </p>
                  </div>

                  {/* Earning & Customer Pills */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Earning Range (Hypothesis)</div>
                      <div className="font-semibold text-emerald-400 mt-0.5">{earning}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Target Client</div>
                      <div className="font-semibold text-slate-300 mt-0.5 truncate">{customer}</div>
                    </div>
                  </div>

                  {/* Tools Needed Combination */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Multi-Tool Synergy</div>
                    <div className="flex flex-wrap gap-1.5">
                      {reqTools.map((tool, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-[11px] font-medium">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer CTA */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-indigo-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    View Action Plan & Score Breakdown <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">₹0 Capital Required</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="panel-card max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 p-6 border-indigo-500/30">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                    selectedOpp.score >= 85 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedOpp.score >= 70 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedOpp.score}/100 Overall Score
                  </span>
                  <span className={`badge-tag text-xs ${
                    (selectedOpp.origin || (selectedOpp.discoveryId ? 'discovery_derived' : 'template')) === 'discovery_derived' ? 'badge-emerald' : 'badge-slate'
                  }`}>
                    {(selectedOpp.origin || (selectedOpp.discoveryId ? 'discovery_derived' : 'template')) === 'discovery_derived' ? 'Discovery-Backed' : 'Hypothesis Template'}
                  </span>
                  <span className={`badge-tag text-xs ${
                    selectedOpp.confidence === 'High' ? 'badge-emerald' : selectedOpp.confidence === 'Medium' ? 'badge-indigo' : 'badge-amber'
                  }`}>
                    {selectedOpp.confidence || 'Medium'} Confidence
                  </span>
                  <span className="badge-tag badge-slate text-xs">{selectedOpp.difficulty} Difficulty</span>
                  <span className="badge-tag badge-slate text-xs">
                    Time to Demo: {selectedOpp.timeToDemo || selectedOpp.time_to_demo || '1-2 days'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-100">{selectedOpp.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedOpp.summary}</p>
              </div>

              <button
                onClick={() => setSelectedOpp(null)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Why Recommended */}
            <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-4 space-y-1.5">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Why Recommended For Your Profile
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedOpp.whyMatch || selectedOpp.why_match || 'Matches your profile skills, zero-budget constraint, and available free tools.'}
              </p>
            </div>

            {/* Adaptive Personalization Explanation */}
            {(selectedOpp.learningExplanation || selectedOpp.learning_explanation) && (
              <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3 text-xs space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  Adaptive Personalization Signal ({((selectedOpp.learningAdjustment || selectedOpp.learning_adjustment || 0) > 0) ? `+${selectedOpp.learningAdjustment || selectedOpp.learning_adjustment}` : (selectedOpp.learningAdjustment || selectedOpp.learning_adjustment)} pts)
                </div>
                <p className="text-slate-300">{selectedOpp.learningExplanation || selectedOpp.learning_explanation}</p>
              </div>
            )}

            {/* User Feedback Widget */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-medium">Was this recommendation accurate?</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleFeedback(selectedOpp.id, 'useful')}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    feedbackStatus[selectedOpp.id] === 'useful'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  👍 Useful
                </button>
                <button
                  onClick={() => handleFeedback(selectedOpp.id, 'not_useful')}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    feedbackStatus[selectedOpp.id] === 'not_useful'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  👎 Not Useful
                </button>
                <button
                  onClick={() => handleFeedback(selectedOpp.id, 'not_relevant')}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    feedbackStatus[selectedOpp.id] === 'not_relevant'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🚫 Not Relevant
                </button>
              </div>
            </div>

            {/* Earning Potential Hypothesis */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Earning Potential (Hypothesis)</span>
                <span className="badge-tag badge-amber text-[10px]">Unverified Income Claim</span>
              </div>
              <div className="text-base font-bold text-emerald-400 font-mono">
                {selectedOpp.earningPotential || selectedOpp.earning_potential || '₹5,000–₹25,000/month'}
              </div>
              <p className="text-xs text-slate-400 italic">
                Basis: {selectedOpp.earningHypothesis?.basis || 'Initial service-pricing hypothesis — validate with real client demand.'}
              </p>
            </div>

            {/* Preserved Discovery Evidence */}
            {selectedOpp.discoveryId && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Preserved Discovery Evidence
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Discovery ID:</span>{' '}
                    <span className="text-slate-300 font-mono">{selectedOpp.discoveryId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Verification:</span>{' '}
                    <span className="badge-tag badge-slate text-[10px]">{selectedOpp.evidence?.verificationStatus || 'unverified'}</span>
                  </div>
                </div>
                {selectedOpp.evidence?.discoveryUrl && (
                  <div className="text-xs">
                    <span className="text-slate-400">Source URL:</span>{' '}
                    <a href={selectedOpp.evidence.discoveryUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">
                      {selectedOpp.evidence.discoveryUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {selectedOpp.evidence?.marketEvidenceNote && (
                  <p className="text-[11px] text-slate-400">{selectedOpp.evidence.marketEvidenceNote}</p>
                )}
              </div>
            )}

            {/* 8-Factor Score Breakdown */}
            <div className="space-y-3 border-b border-slate-800 pb-5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                Transparent 8-Factor Score Breakdown
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {factors.map((f) => {
                  const breakdown = selectedOpp.scoreBreakdown || selectedOpp.score_breakdown || {};
                  const val = (breakdown as any)[f.key] || 0;
                  const pct = Math.round((val / f.max) * 100);

                  return (
                    <div key={f.key} className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300">{f.name} ({f.weight})</span>
                        <span className="font-mono text-indigo-400">{val} / {f.max} pts</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Delivery Workflow */}
            <div className="space-y-3 border-b border-slate-800 pb-5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Delivery & Service Workflow
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                {(selectedOpp.workflow || []).map((step, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex-1 bg-slate-950 p-3 rounded border border-slate-800 text-xs space-y-1 w-full">
                      <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Step {idx + 1}</div>
                      <div className="text-slate-200 font-medium">{step}</div>
                    </div>
                    {idx < (selectedOpp.workflow || []).length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-400 hidden sm:block shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step-by-Step Action Plan */}
            <div className="space-y-3 border-b border-slate-800 pb-5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Step-by-Step Action Roadmap
              </h4>

              <div className="space-y-2.5">
                {((selectedOpp.actionPlan || selectedOpp.action_plan) || []).map((step: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 p-3.5 rounded border border-slate-800 flex items-start gap-3">
                    <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-mono text-xs font-bold shrink-0">
                      {step.dayOrPhase}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-200 flex items-center justify-between">
                        <span>{step.title}</span>
                        {step.estimatedHours && (
                          <span className="text-[10px] font-mono text-slate-400">{step.estimatedHours} hrs</span>
                        )}
                      </div>
                      <p className="text-slate-400 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risks & Caveats */}
            {(selectedOpp.risks || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Risks & Execution Considerations
                </h4>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 bg-slate-950 p-3 rounded border border-slate-800">
                  {selectedOpp.risks.map((risk, i) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Action Footer */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
              <button
                onClick={(e) => handleToggleSave(e, selectedOpp.id)}
                className={`btn-secondary text-xs flex items-center gap-1.5 ${selectedOpp.saved ? 'text-amber-400 border-amber-500/40' : ''}`}
              >
                {selectedOpp.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {selectedOpp.saved ? 'Saved Opportunity' : 'Save Opportunity'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartActionPlan(selectedOpp.id)}
                  disabled={startingPlan}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-900/40"
                >
                  <Play className={`h-3.5 w-3.5 ${startingPlan ? 'animate-spin' : ''}`} />
                  {startingPlan ? 'Preparing Plan...' : 'Start Action Plan'}
                </button>

                <button
                  onClick={() => setSelectedOpp(null)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
