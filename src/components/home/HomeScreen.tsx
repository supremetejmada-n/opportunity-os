import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Wrench, 
  Target, 
  Zap,
  Info,
  Compass
} from 'lucide-react';
import { UserProfile, UserSkill, UserTool, UserGoal } from '../../types/index.js';
import { NavTab } from '../layout/Navbar.js';
import { api } from '../../services/api.js';

interface HomeScreenProps {
  profile: UserProfile | null;
  skills: UserSkill[];
  tools: UserTool[];
  goals: UserGoal[];
  setActiveTab: (tab: NavTab) => void;
  onScanClick: () => void;
  isScanning: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  skills,
  tools,
  goals,
  setActiveTab,
  onScanClick,
  isScanning,
}) => {
  const [bestOpp, setBestOpp] = React.useState<any>(null);
  const freeToolsCount = tools.filter(t => t.access_type.toLowerCase().includes('free') || t.access_type.toLowerCase().includes('open')).length;

  React.useEffect(() => {
    api.getOpportunities({ limit: '1' })
      .then(res => {
        if (res && res.bestOpportunity) {
          setBestOpp(res.bestOpportunity);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 py-2 max-w-5xl mx-auto">
      {/* 1. HEADER SECTION */}
      <section className="space-y-2 border-b border-slate-800/80 pb-6">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
          Personal Intelligence System
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          What deserves your attention today?
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          The engine evaluates new open-source releases, free tools, market demand, and your personal execution capabilities to filter out clutter and isolate high-value opportunities.
        </p>

        {/* Compact Contextual Summary Line */}
        <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Zap className="h-3.5 w-3.5 text-slate-400" />
            <strong className="text-slate-100 font-bold">{skills.length}</strong> skills configured
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Wrench className="h-3.5 w-3.5 text-emerald-400" />
            <strong className="text-slate-100 font-bold">{tools.length}</strong> available tools ({freeToolsCount} free)
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Target className="h-3.5 w-3.5 text-slate-400" />
            <strong className="text-slate-100 font-bold">{goals.length}</strong> active goals
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-emerald-400 font-semibold">
            ₹{profile?.preferred_budget ?? 0} startup budget limit
          </span>
        </div>
      </section>

      {/* 2. PRIMARY OPPORTUNITY AREA (YOUR STRONGEST OPPORTUNITY) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Your Strongest Opportunity</h2>
          </div>
          <span className="badge-tag badge-indigo">Primary Recommendation</span>
        </div>

        {bestOpp ? (
          <div className="panel-card p-6 space-y-4 bg-slate-900 border border-indigo-500/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                  {bestOpp.score}/100 Match Score
                </span>
                <span className="badge-tag badge-slate text-xs">{bestOpp.difficulty}</span>
                <span className="badge-tag badge-slate text-xs">{bestOpp.timeToDemo || bestOpp.time_to_demo || '1-2 days'}</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {bestOpp.earningPotential || bestOpp.earning_potential || '₹5,000–₹25,000/month'}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">{bestOpp.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">{bestOpp.summary}</p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {(bestOpp.requiredTools || bestOpp.required_tools || []).map((tool: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-[11px] font-medium">
                    {tool}
                  </span>
                ))}
              </div>

              <button
                onClick={() => setActiveTab('opportunities')}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <span>View Full Opportunity & Action Plan</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="panel-card p-6 sm:p-8 space-y-5 bg-slate-900 border border-slate-800">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono font-semibold">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span>Opportunity Engine Standby</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug">
                Your personalized recommendations will appear here after the first discovery scan.
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
                When triggered, the system scans open-source repositories, Hugging Face models, RSS feeds, and market signals. It verifies licensing, evaluates monetization potential, checks execution feasibility against your profile, and ranks recommendations using an 8-factor scoring formula.
              </p>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                onClick={onScanClick}
                disabled={isScanning}
                className="btn-primary"
              >
                <Zap className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning Sources...' : 'Run First Scan'}</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="btn-secondary"
              >
                <span>Manage Profile & Capabilities</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. WORTH KNOWING SECTION */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Worth Knowing</h2>
          <span className="text-xs text-indigo-400 font-mono">Phase 4 Active</span>
        </div>

        <div className="panel-card p-6 bg-slate-900/60 border border-slate-800 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 shrink-0 mt-0.5">
            <Compass className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-200">Personalized Opportunity Engine Connected</h3>
              <span className="badge-tag badge-indigo text-[10px]">8-Factor Scoring Model</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every discovery is evaluated against your skills, tools, and budget. High-score opportunities combine 1 to 4 tools to generate zero-cost, high-demand freelance & digital service deliverables.
            </p>
          </div>
        </div>
      </section>

      {/* 4. YOUR NEXT MOVE (ONE CLEAR ACTION) */}
      <section className="panel-card p-5 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Your Next Move
          </span>
          <h3 className="text-sm font-bold text-slate-100">
            Review and complete your Personal Profile
          </h3>
          <p className="text-xs text-slate-400">
            Ensure your active skills, accessible tools, and constraints reflect what you can realistically execute today.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('profile')}
          className="btn-primary text-xs shrink-0"
        >
          <span>Complete Profile</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
};
