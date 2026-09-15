import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Wrench, 
  Target, 
  Zap,
  Info,
  Compass,
  CheckCircle2,
  ChevronDown,
  ChevronUp
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
  const [showDetails, setShowDetails] = React.useState<boolean>(false);
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

  const userName = profile?.name ? profile.name.split(' ')[0] : 'there';

  return (
    <div className="space-y-8 py-2 max-w-5xl mx-auto">
      {/* 1. HEADER SECTION */}
      <section className="space-y-2 border-b border-slate-800/80 pb-6">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
          Personal Intelligence System
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Good day, {userName}. What deserves your attention today?
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Here is your top personalized recommendation, calculated from your active skills, free tools, and target goals.
        </p>

        {/* Human-Friendly Summary Line */}
        <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <strong className="text-slate-100 font-bold">{skills.length}</strong> skills
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Wrench className="h-3.5 w-3.5 text-emerald-400" />
            <strong className="text-slate-100 font-bold">{tools.length}</strong> tools ({freeToolsCount} free)
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Target className="h-3.5 w-3.5 text-slate-400" />
            <strong className="text-slate-100 font-bold">{goals.length}</strong> goals
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-emerald-400 font-semibold">
            ₹{profile?.preferred_budget ?? 0} budget limit
          </span>
        </div>
      </section>

      {/* 2. HERO SECTION: YOUR BEST OPPORTUNITY */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Your Best Opportunity</h2>
          </div>
          <span className="badge-tag badge-indigo">Top Recommendation</span>
        </div>

        {bestOpp ? (
          <div className="panel-card p-6 space-y-4 bg-slate-900 border border-indigo-500/30">
            {/* Top Surface Summary */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                    {bestOpp.score}% Fit for You
                  </span>
                  <span className="badge-tag badge-slate text-xs">
                    {bestOpp.difficulty === 'Easy' ? 'Easy to execute' : bestOpp.difficulty}
                  </span>
                  <span className="badge-tag badge-slate text-xs">
                    ~{bestOpp.timeToDemo || bestOpp.time_to_demo || '1-2 days'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-100 pt-1">{bestOpp.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{bestOpp.summary}</p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400 font-mono">Possible Earnings</div>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  {bestOpp.earningPotential || bestOpp.earning_potential || '₹5,000–₹25,000/mo'}
                </div>
                <div className="text-[11px] text-slate-500">₹0 to start</div>
              </div>
            </div>

            {/* Why This Fits You (3 Concise Reasons Maximum) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Why this fits you
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Uses tools you already access (<strong>{(bestOpp.requiredTools || bestOpp.required_tools || []).join(', ') || 'AI & Dev tools'}</strong>)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Matches your ₹0 upfront capital requirement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Can produce a working demo within ~{bestOpp.timeToDemo || bestOpp.time_to_demo || '1-2 days'}</span>
                </li>
              </ul>
            </div>

            {/* Main Primary CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors font-medium"
              >
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>{showDetails ? 'Hide details' : 'See why this was recommended'}</span>
              </button>

              <button
                onClick={() => setActiveTab('opportunities')}
                className="btn-primary text-xs flex items-center gap-2 py-2.5 px-5 shadow-md shadow-indigo-950"
              >
                <span>See the plan</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Progressive Disclosure: Deep Score & Match Breakdown */}
            {showDetails && (
              <div className="pt-3 border-t border-slate-800 space-y-3 bg-slate-950 p-4 rounded-lg text-xs">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Recommendation Rationale
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  {bestOpp.whyMatch || bestOpp.why_match || 'Selected based on your skills, tool availability, and zero-cost execution preference.'}
                </p>
                {bestOpp.scoreBreakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Skill Fit</span>
                      <strong className="text-indigo-300">{bestOpp.scoreBreakdown.skillMatch || 22}/25 pts</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Market Demand</span>
                      <strong className="text-indigo-300">{bestOpp.scoreBreakdown.marketDemand || 18}/20 pts</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Tool Match</span>
                      <strong className="text-indigo-300">{bestOpp.scoreBreakdown.toolMatch || 14}/15 pts</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">₹0 Feasibility</span>
                      <strong className="text-emerald-400">{bestOpp.scoreBreakdown.startupCost || 15}/15 pts</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="panel-card p-6 sm:p-8 space-y-5 bg-slate-900 border border-slate-800">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono font-semibold">
                <Info className="h-3.5 w-3.5 text-indigo-400" />
                <span>Ready to Scan</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug">
                Your personalized recommendations will appear here after your first scan.
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
                The engine checks open-source projects, free AI tools, and market demand to find zero-cost ways to earn that fit your skills.
              </p>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                onClick={onScanClick}
                disabled={isScanning}
                className="btn-primary"
              >
                <Zap className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Run First Scan'}</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="btn-secondary text-xs"
              >
                <span>Edit Profile</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. WORTH KNOWING (2 CONCISE ITEMS MAXIMUM) */}
      <section className="space-y-3 pt-2">
        <h2 className="text-base font-bold text-slate-100">Worth Knowing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="panel-card p-5 bg-slate-900/60 border border-slate-800 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-indigo-950 border border-indigo-800/60 text-indigo-400 shrink-0 mt-0.5">
              <Compass className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">Zero-Cost Execution Focus</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recommendations prioritize workflows combining 2–4 tools you already own or can access for free.
              </p>
            </div>
          </div>

          <div className="panel-card p-5 bg-slate-900/60 border border-slate-800 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-400 shrink-0 mt-0.5">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">Adaptive Personalization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As you rate recommendations or log progress, the system learns your preferred project types automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. YOUR NEXT MOVE (ONE CLEAR ACTION) */}
      <section className="panel-card p-5 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
            Your Next Move
          </span>
          <h3 className="text-sm font-bold text-slate-100">
            {bestOpp ? 'Review your action plan' : 'Review your profile skills & tools'}
          </h3>
          <p className="text-xs text-slate-400">
            {bestOpp 
              ? 'Start the step-by-step roadmap to build your first demo.' 
              : 'Keep your tools and goals updated to receive the best matches.'}
          </p>
        </div>

        <button
          onClick={() => setActiveTab(bestOpp ? 'opportunities' : 'profile')}
          className="btn-primary text-xs shrink-0"
        >
          <span>{bestOpp ? 'See the plan' : 'Edit profile'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
};

