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
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, UserSkill, UserTool, UserGoal } from '../../types/index.js';
import { NavTab } from '../layout/Navbar.js';
import { api } from '../../services/api.js';
import { SpatialHeroOrb } from '../ui/SpatialHeroOrb.js';
import { GlassCard } from '../ui/GlassCard.js';

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
    <div className="space-y-8 py-4 max-w-6xl mx-auto">
      {/* 1. ATMOSPHERIC SPATIAL HERO */}
      <section className="relative space-y-4 border-b border-white/10 pb-8">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-peach-500/15 border border-peach-500/35 text-peach-500 text-xs font-sans font-semibold tracking-wider uppercase">
            Personal Intelligence System
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-slate-100 via-slate-200 to-peach-400 bg-clip-text text-transparent">
              Find something worth building.
            </h1>
            <p className="font-sans text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Welcome back, <strong className="text-white font-semibold">{userName}</strong>. Opportunity OS has evaluated live public sources against your profile vector. Here is your top zero-capital match.
            </p>

            {/* Humanized Vector Metrics Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 font-sans">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Zap className="h-3.5 w-3.5 text-peach-500" />
                <strong className="text-slate-100 font-bold num-tabular">{skills.length}</strong> active skills
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                <strong className="text-slate-100 font-bold num-tabular">{tools.length}</strong> tools ({freeToolsCount} free)
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                <strong className="text-slate-100 font-bold num-tabular">{goals.length}</strong> goals
              </span>
              <span className="text-slate-700">•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> <span className="num-tabular">₹{profile?.preferred_budget ?? 0}</span> budget limit
              </span>
            </div>
          </div>

          {/* Interactive 3D Spatial Crystal Orb */}
          <div className="lg:col-span-5 flex justify-center">
            <SpatialHeroOrb />
          </div>
        </div>
      </section>

      {/* 2. PRIMARY RECOMMENDATION SHOWCASE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-peach-500" />
            <h2 className="font-display text-lg font-bold text-slate-200 uppercase tracking-wider">Top Recommendation</h2>
          </div>
          <span className="badge-tag badge-peach font-sans">#1 Match Score</span>
        </div>

        {bestOpp ? (
          <GlassCard variant="primary" interactive className="p-6 sm:p-8 space-y-6">
            {/* Top Surface Summary */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold shadow-md shadow-emerald-950/40">
                    {bestOpp.score}% Fit for You
                  </span>
                  <span className="badge-tag badge-slate text-xs">
                    {bestOpp.difficulty === 'Easy' ? 'Easy to execute' : bestOpp.difficulty}
                  </span>
                  <span className="badge-tag badge-slate text-xs">
                    ~{bestOpp.timeToDemo || bestOpp.time_to_demo || '1-2 days'}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight pt-1">
                  {bestOpp.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {bestOpp.summary}
                </p>
              </div>

              <div className="bg-navy-950/80 p-4 rounded-xl border border-white/10 text-right shrink-0 space-y-1 shadow-inner">
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Possible Earnings</div>
                <div className="text-lg font-extrabold text-emerald-400 font-mono">
                  {bestOpp.earningPotential || bestOpp.earning_potential || '₹5,000–₹25,000/mo'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">₹0 upfront cost</div>
              </div>
            </div>

            {/* Why This Fits You */}
            <div className="space-y-3 bg-navy-950/50 p-4 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-peach-500 uppercase tracking-wider block">
                Why this fits you
              </span>
              <ul className="space-y-2 text-xs text-slate-200">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Uses tools you access (<strong>{(bestOpp.requiredTools || bestOpp.required_tools || []).join(', ') || 'AI & Dev tools'}</strong>)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Matches your ₹0 upfront budget requirement</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Working demo can be created in ~{bestOpp.timeToDemo || bestOpp.time_to_demo || '1-2 days'}</span>
                </li>
              </ul>
            </div>

            {/* Main Primary CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-white/10">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="btn-ghost text-xs flex items-center gap-1.5"
              >
                {showDetails ? <ChevronUp className="h-4 w-4 text-peach-500" /> : <ChevronDown className="h-4 w-4 text-peach-500" />}
                <span>{showDetails ? 'Hide match breakdown' : 'Why this was recommended'}</span>
              </button>

              <button
                onClick={() => setActiveTab('opportunities')}
                className="btn-primary text-xs flex items-center gap-2 py-2.5 px-6"
              >
                <span>See the plan</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Progressive Rationale Breakdown */}
            {showDetails && (
              <div className="pt-3 border-t border-white/10 space-y-3 bg-navy-950/90 p-4 rounded-xl text-xs animate-fade-in">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Recommendation Rationale
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  {bestOpp.whyMatch || bestOpp.why_match || 'Selected based on your skills, tool availability, and zero-cost execution preference.'}
                </p>
                {bestOpp.scoreBreakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-navy-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 block">Skill Fit</span>
                      <strong className="text-peach-500">{bestOpp.scoreBreakdown.skillMatch || 22}/25 pts</strong>
                    </div>
                    <div className="bg-navy-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 block">Market Demand</span>
                      <strong className="text-peach-500">{bestOpp.scoreBreakdown.marketDemand || 18}/20 pts</strong>
                    </div>
                    <div className="bg-navy-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 block">Tool Match</span>
                      <strong className="text-peach-500">{bestOpp.scoreBreakdown.toolMatch || 14}/15 pts</strong>
                    </div>
                    <div className="bg-navy-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 block">₹0 Feasibility</span>
                      <strong className="text-emerald-400">{bestOpp.scoreBreakdown.startupCost || 15}/15 pts</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        ) : (
          <GlassCard variant="secondary" className="p-8 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-navy-950 border border-white/10 text-slate-400 text-xs font-mono font-semibold">
                <Info className="h-3.5 w-3.5 text-peach-500" />
                <span>Ready to Scan</span>
              </div>

              <h3 className="text-xl font-bold text-slate-100 leading-snug">
                Your personalized recommendations will appear here after your first scan.
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                The engine evaluates open-source projects, accessible tools, and buyer demand to find zero-cost ways to earn.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button onClick={onScanClick} disabled={isScanning} className="btn-primary">
                <Zap className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Run First Scan'}</span>
              </button>

              <button onClick={() => setActiveTab('profile')} className="btn-secondary text-xs">
                <span>Edit Profile</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </GlassCard>
        )}
      </section>

      {/* 3. WORTH KNOWING (2 CONCISE ITEMS) */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Worth Knowing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard variant="secondary" interactive className="p-5 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-burgundy-900/80 border border-crimson-500/30 text-peach-500 shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">Zero-Cost Execution Focus</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recommendations prioritize workflows combining 2–4 tools you already own or can access for free.
              </p>
            </div>
          </GlassCard>

          <GlassCard variant="secondary" interactive className="p-5 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">Adaptive Personalization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As you rate recommendations or log progress, the system learns your preferred project types automatically.
              </p>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* 4. YOUR NEXT MOVE (FLOATING GLASS SECTION) */}
      <GlassCard variant="floating" interactive className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-peach-500 uppercase tracking-wider block">
            Your Next Move
          </span>
          <h3 className="text-base font-bold text-slate-100">
            {bestOpp ? 'Review your action plan' : 'Review your profile skills & tools'}
          </h3>
          <p className="text-xs text-slate-300">
            {bestOpp 
              ? 'Start the step-by-step roadmap to build your first demo.' 
              : 'Keep your tools and goals updated to receive the best matches.'}
          </p>
        </div>

        <button
          onClick={() => setActiveTab(bestOpp ? 'opportunities' : 'profile')}
          className="btn-primary text-xs shrink-0 py-2.5 px-5"
        >
          <span>{bestOpp ? 'See the plan' : 'Edit profile'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </GlassCard>
    </div>
  );
};
