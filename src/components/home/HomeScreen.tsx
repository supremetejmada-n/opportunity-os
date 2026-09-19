import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Wrench, 
  Target, 
  Zap, 
  Compass, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  Layers,
  Cpu,
  TrendingUp,
  Award,
  Play
} from 'lucide-react';
import { UserProfile, UserSkill, UserTool, UserGoal } from '../../types/index.js';
import { NavTab } from '../layout/Navbar.js';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { MagneticButton } from '../ui/MagneticButton.js';
import { ScrollStorySection } from '../ui/ScrollStorySection.js';
import { SpatialToolWeb } from '../ui/SpatialToolWeb.js';

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
    <div className="space-y-12 sm:space-y-16 pb-12 w-full">
      {/* 1. SCROLL-DRIVEN SPATIAL STORYTELLING SECTION (FULL VIEWPORT) */}
      <ScrollStorySection
        /* STATE 1 — DISCOVER */
        state1Content={
          <div className="space-y-6 max-w-3xl my-auto">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/35 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase">
                01 DISCOVER • LIVE PUBLIC VECTOR
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] bg-gradient-to-r from-slate-100 via-slate-200 to-peach-400 bg-clip-text text-transparent">
                Find something worth building.
              </h1>
              <p className="font-sans text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Welcome back, <strong className="text-white font-semibold">{userName}</strong>. Opportunity OS evaluates live public sources against your profile vector in real time.
              </p>
            </div>

            {/* Vector Metrics Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-slate-400 font-sans border-t border-white/10 pt-4">
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

            <div className="pt-2">
              <button
                onClick={onScanClick}
                disabled={isScanning}
                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 shadow-lg shadow-peach-500/20"
              >
                <Zap className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning Live Sources...' : 'Initiate Discovery Scan'}</span>
              </button>
            </div>
          </div>
        }

        /* STATE 2 — UNDERSTAND */
        state2Content={
          <div className="space-y-5 max-w-3xl my-auto">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
                02 UNDERSTAND • #1 MATCH SCORE
              </span>
              {bestOpp && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                  {bestOpp.score}% Fit for You
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
                {bestOpp ? bestOpp.title : 'AI Document Audit & Automation Micro-SaaS'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {bestOpp ? bestOpp.summary : 'Evaluated against your accessible tools and zero-cost execution constraints.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-navy-950/60 p-3.5 rounded-xl border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Possible Earnings</span>
                <p className="text-base font-extrabold text-emerald-400 font-mono">
                  {bestOpp ? (bestOpp.earningPotential || bestOpp.earning_potential) : '₹5,000–₹25,000/mo'}
                </p>
              </div>
              <div className="bg-navy-950/60 p-3.5 rounded-xl border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Time to Working Demo</span>
                <p className="text-base font-bold text-slate-200 font-mono">
                  ~{bestOpp ? (bestOpp.timeToDemo || bestOpp.time_to_demo) : '1-2 days'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <MagneticButton
                onClick={() => setActiveTab('opportunities')}
                variant="primary"
                className="text-xs py-2.5 px-6 font-bold shadow-lg shadow-peach-500/30"
              >
                <span>See full action plan</span>
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            </div>
          </div>
        }

        /* STATE 3 — COMBINE */
        state3Content={
          <div className="space-y-4 max-w-3xl my-auto">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-burgundy-900/60 border border-crimson-500/40 text-peach-300 text-xs font-mono font-bold tracking-wider uppercase">
                03 COMBINE • 3D CAPABILITY SYNERGY
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
                Combine the tools you already access.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The engine links 2–4 accessible tools into high-value zero-cost workflows.
              </p>
            </div>

            {/* 3D Tool Synergy Web Canvas */}
            <div className="bg-navy-950/70 rounded-xl border border-white/10 overflow-hidden relative h-48 sm:h-56">
              <SpatialToolWeb 
                toolNames={tools.length > 0 ? tools.map(t => t.name) : ['Python', 'ChatGPT API', 'SQLite', 'Vite']} 
                activeIndices={[0, 1, 2]} 
              />
            </div>

            <div className="pt-1">
              <button
                onClick={() => setActiveTab('combine')}
                className="btn-secondary text-xs py-2.5 px-5 font-bold flex items-center gap-2"
              >
                <Cpu className="h-4 w-4 text-peach-400" />
                <span>Explore Tool Combiner →</span>
              </button>
            </div>
          </div>
        }

        /* STATE 4 — ACT */
        state4Content={
          <div className="space-y-5 max-w-3xl my-auto">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase">
                04 ACT • 6-PHASE EXECUTION ROADMAP
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
                Turn opportunity into a clear roadmap.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Follow structured execution phases to build demos and acquire real buyers.
              </p>
            </div>

            {/* 6-Phase Roadmap Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                { phase: '1. LEARN', text: 'Understand buyer demand' },
                { phase: '2. BUILD', text: 'Create MVP demo in 24h' },
                { phase: '3. PORTFOLIO', text: 'Host public demo page' },
                { phase: '4. PROSPECT', text: 'Identify 10 ideal buyers' },
                { phase: '5. OUTREACH', text: 'Send tailored proposals' },
                { phase: '6. RESULT', text: 'Log revenue & feedback' },
              ].map((item, idx) => (
                <div key={idx} className="bg-navy-950/60 p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-peach-400 block">{item.phase}</span>
                  <p className="text-xs text-slate-200 font-sans font-medium">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <MagneticButton
                onClick={() => setActiveTab('progress')}
                variant="primary"
                className="text-xs py-2.5 px-6 font-bold shadow-lg shadow-peach-500/30"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Execute Action Plan</span>
              </MagneticButton>
            </div>
          </div>
        }

        /* STATE 5 — LEARN */
        state5Content={
          <div className="space-y-5 max-w-3xl my-auto">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold tracking-wider uppercase">
                05 LEARN • ADAPTIVE FEEDBACK LOOP
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
                Your results improve what comes next.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Every logged action, demo created, and buyer interaction fine-tunes your match vector.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-navy-950/60 p-3.5 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Vector</span>
                <p className="text-lg font-bold text-peach-400 font-mono">100% Calibrated</p>
              </div>
              <div className="bg-navy-950/60 p-3.5 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Matches Ready</span>
                <p className="text-lg font-bold text-emerald-400 font-mono">High Quality</p>
              </div>
              <div className="bg-navy-950/60 p-3.5 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Execution Cost</span>
                <p className="text-lg font-bold text-slate-100 font-mono">₹0 Upfront</p>
              </div>
              <div className="bg-navy-950/60 p-3.5 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Feedback Status</span>
                <p className="text-lg font-bold text-amber-400 font-mono">Active</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab('discover')}
                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2"
              >
                <span>Explore Full Opportunity Engine</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* 2 & 3. BOTTOM SECTIONS (RELEASED CLEANLY BELOW PINNED STORY) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 w-full">
        {/* WORTH KNOWING */}
        <section className="space-y-4 pt-4">
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">Worth Knowing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlassCard variant="secondary" interactive className="p-5 sm:p-6 flex items-start gap-4 sm:gap-5">
              <div className="w-11 h-11 rounded-xl bg-burgundy-900/80 border border-crimson-500/30 text-peach-500 flex items-center justify-center shrink-0 shadow-inner">
                <Compass className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">Zero-Cost Execution Focus</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Recommendations prioritize workflows combining 2–4 tools you already own or can access for free.
                </p>
              </div>
            </GlassCard>

            <GlassCard variant="secondary" interactive className="p-5 sm:p-6 flex items-start gap-4 sm:gap-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Zap className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">Adaptive Personalization</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  As you rate recommendations or log progress, the system learns your preferred project types automatically.
                </p>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* YOUR NEXT MOVE */}
        <GlassCard variant="floating" interactive className="p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <span className="text-[10px] font-mono font-bold text-peach-500 uppercase tracking-widest block">
              YOUR NEXT MOVE
            </span>
            <h3 className="text-base sm:text-xl font-bold text-slate-100 tracking-tight">
              {bestOpp ? 'Review your action plan' : 'Review your profile skills & tools'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {bestOpp 
                ? 'Start the step-by-step roadmap to build your first demo.' 
                : 'Keep your tools and goals updated to receive the best matches.'}
            </p>
          </div>

          <MagneticButton
            onClick={() => setActiveTab(bestOpp ? 'opportunities' : 'profile')}
            variant="primary"
            className="text-xs shrink-0 py-3 px-6 shadow-lg shadow-peach-500/20 font-bold mt-1 sm:mt-0"
          >
            <span>{bestOpp ? 'See the plan' : 'Edit profile'}</span>
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </GlassCard>
      </div>
    </div>
  );
};


