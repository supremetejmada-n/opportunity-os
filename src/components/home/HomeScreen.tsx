import React, { useRef } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Wrench, 
  Target, 
  Zap, 
  Compass, 
  ShieldCheck,
  Layers,
  Cpu,
  Play
} from 'lucide-react';
import { UserProfile, UserSkill, UserTool, UserGoal } from '../../types/index.js';
import { NavTab } from '../layout/Navbar.js';
import { api } from '../../services/api.js';
import { GlassCard } from '../ui/GlassCard.js';
import { MagneticButton } from '../ui/MagneticButton.js';
import { ScrollStorySection } from '../ui/ScrollStorySection.js';
import { SpatialToolWeb } from '../ui/SpatialToolWeb.js';

// Modular Homepage Sections
import { HomeHero } from './HomeHero.js';
import { WhyOpportunityOS } from './WhyOpportunityOS.js';
import { ProductOutcomes } from './ProductOutcomes.js';
import { ProductInAction } from './ProductInAction.js';
import { ZeroCostPhilosophy } from './ZeroCostPhilosophy.js';
import { CreatorStory } from './CreatorStory.js';
import { HomeClosingCTA } from './HomeClosingCTA.js';

import { PRODUCT_STORY_SLIDES, getCuratedSlide } from '../../data/productStoryData.js';

interface HomeScreenProps {
  profile: UserProfile | null;
  skills: UserSkill[];
  tools: UserTool[];
  goals: UserGoal[];
  setActiveTab: (tab: NavTab) => void;
  onScanClick: () => void;
  isScanning: boolean;
  dataVersion?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  skills,
  tools,
  goals,
  setActiveTab,
  onScanClick,
  isScanning,
  dataVersion,
}) => {
  const [bestOpp, setBestOpp] = React.useState<any>(null);
  const [productStory, setProductStory] = React.useState<any>(null);
  const [hasCompletedScan, setHasCompletedScan] = React.useState<boolean>(false);
  const [isLoadingStory, setIsLoadingStory] = React.useState<boolean>(true);

  const storyRef = useRef<HTMLDivElement>(null);
  const freeToolsCount = tools.filter(t => t.access_type.toLowerCase().includes('free') || t.access_type.toLowerCase().includes('open')).length;

  const loadLatestOpportunity = React.useCallback(() => {
    setIsLoadingStory(true);
    Promise.all([
      api.getCurrentProductStory().catch(err => {
        console.warn('Error fetching Product Story:', err);
        return null;
      }),
      api.getLatestScanOpportunity().catch(err => {
        console.warn('Error fetching Product Story opportunity:', err);
        return null;
      })
    ]).then(([storyRes, oppRes]) => {
      if (storyRes?.success && storyRes.story) {
        setProductStory(storyRes.story);
      }
      if (oppRes) {
        setHasCompletedScan(Boolean(oppRes.hasCompletedScan));
        setBestOpp(oppRes.bestOpportunity || null);
      }
    }).finally(() => {
      setIsLoadingStory(false);
    });
  }, []);

  React.useEffect(() => {
    loadLatestOpportunity();
  }, [loadLatestOpportunity, isScanning, dataVersion]);

  const userName = profile?.name ? profile.name.split(' ')[0] : 'there';

  const scrollToStory = () => {
    if (storyRef.current) {
      storyRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveTab('opportunities');
    }
  };

  // Extract narrative stages from productStory if available
  const stages = productStory?.narrative_stages || productStory?.narrativeStages || {};
  const s1 = getCuratedSlide('discover', stages.discover);
  const s2 = getCuratedSlide('understand', stages.understand);
  const s3 = getCuratedSlide('combine', stages.combine);
  const s4 = getCuratedSlide('act', stages.act);
  const s5 = getCuratedSlide('learn', stages.learn);

  // Tools to display in Phase 03 Combine
  const requiredToolsToDisplay = bestOpp?.requiredTools && Array.isArray(bestOpp.requiredTools) && bestOpp.requiredTools.length > 0
    ? bestOpp.requiredTools
    : (tools.length > 0 ? tools.map(t => t.name) : ['Python', 'LLM API', 'SQLite']);

  // Execution phases to display in Phase 04 Act
  const actionPhasesToDisplay = bestOpp?.actionPlan && Array.isArray(bestOpp.actionPlan) && bestOpp.actionPlan.length > 0
    ? bestOpp.actionPlan.map((step: any, idx: number) => ({
        phase: `${idx + 1}. ${step.dayOrPhase || `PHASE ${idx + 1}`}`,
        text: step.title || step.description
      }))
    : [
        { phase: '1. LEARN', text: `Analyze buyer demand for ${bestOpp?.title || 'service'}` },
        { phase: '2. BUILD', text: `Create MVP demo in ~${bestOpp?.timeToDemo || '24h'}` },
        { phase: '3. PORTFOLIO', text: 'Host public demo page' },
        { phase: '4. PROSPECT', text: `Identify 10 ideal ${bestOpp?.customerType || 'buyers'}` },
        { phase: '5. OUTREACH', text: 'Send tailored proposals' },
        { phase: '6. RESULT', text: 'Log revenue & feedback' },
      ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 w-full">
      {/* SECTION 1 — HERO / FIRST IMPRESSION */}
      <HomeHero
        userName={userName}
        profile={profile}
        skills={skills}
        tools={tools}
        goals={goals}
        onExploreClick={() => setActiveTab('discover')}
        onScanClick={onScanClick}
        isScanning={isScanning}
      />

      {/* SECTION 2 & 3 — THE PROBLEM & THE BIG IDEA */}
      <WhyOpportunityOS />

      {/* SECTION 4 — HOW IT WORKS (SCROLL STORYTELLING STAGE) */}
      <div ref={storyRef} className="w-full">
        {isLoadingStory ? (
          <div className="py-20 text-center space-y-3 bg-navy-950/60 rounded-3xl border border-white/10 my-8">
            <div className="flex justify-center">
              <Zap className="h-8 w-8 text-peach-400 animate-spin" />
            </div>
            <p className="text-sm font-mono text-slate-300">Loading your latest opportunity from your discovery scan...</p>
          </div>
        ) : (
          /* FULL DYNAMIC 5-PHASE PRODUCT STORY */
          <ScrollStorySection
            /* STATE 1 — DISCOVER */
            state1Content={
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full my-auto">
                <div className="lg:col-span-7 space-y-4 text-left">
                  <div className="max-w-xl overflow-hidden space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/35 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase truncate max-w-full">
                        {s1.badge}
                      </span>
                      {productStory && (
                        <span className="px-2.5 py-0.5 rounded-full bg-navy-900 border border-peach-500/30 text-peach-300 text-[11px] font-mono font-semibold">
                          Story v{productStory.version} • {productStory.theme_detected || productStory.themeDetected || 'Live Market Radar'}
                        </span>
                      )}
                    </div>

                    <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] bg-gradient-to-r from-slate-100 via-slate-200 to-peach-400 bg-clip-text text-transparent line-clamp-2">
                      {s1.headline}
                    </h1>

                    <p className="font-sans text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {s1.body}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onScanClick}
                      disabled={isScanning}
                      className="btn-primary text-xs py-3 px-7 font-bold flex items-center gap-2 shadow-lg shadow-peach-500/20 cursor-pointer"
                    >
                      <Zap className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Scanning Live Sources...' : 'Initiate Discovery Scan'}</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-navy-950/70 p-5 rounded-2xl border border-white/10 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Vector Status</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      Active Scan Result
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 font-sans">
                    <div className="bg-navy-900/60 p-3 rounded-xl border border-white/5 space-y-1">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                        <Zap className="h-3 w-3 text-peach-500" /> Active Skills
                      </span>
                      <p className="text-base font-bold text-slate-100 font-mono">{skills.length}</p>
                    </div>

                    <div className="bg-navy-900/60 p-3 rounded-xl border border-white/5 space-y-1">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                        <Wrench className="h-3 w-3 text-emerald-400" /> Accessible Tools
                      </span>
                      <p className="text-base font-bold text-slate-100 font-mono">{tools.length} <span className="text-[10px] text-emerald-400">({freeToolsCount} free)</span></p>
                    </div>

                    <div className="bg-navy-900/60 p-3 rounded-xl border border-white/5 space-y-1">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                        <Target className="h-3 w-3 text-amber-400" /> Source Origin
                      </span>
                      <p className="text-xs font-bold text-amber-300 font-mono truncate">{bestOpp?.origin === 'discovery_derived' ? (bestOpp?.evidence?.discoverySource || 'Live Launch') : (bestOpp ? 'Profile Match' : 'Live Discovery Vector')}</p>
                    </div>

                    <div className="bg-navy-900/60 p-3 rounded-xl border border-white/5 space-y-1">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                        <ShieldCheck className="h-3 w-3 text-emerald-400" /> Budget Limit
                      </span>
                      <p className="text-base font-bold text-emerald-400 font-mono">
                        {profile?.preferred_budget !== undefined && profile?.preferred_budget !== null && !isNaN(Number(profile.preferred_budget))
                          ? Number(profile.preferred_budget) === 0
                            ? "₹0 (Free Only)"
                            : `₹${profile.preferred_budget}`
                          : "₹0 (Free Only)"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            }

            /* STATE 2 — UNDERSTAND */
            state2Content={
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full my-auto">
                <div className="lg:col-span-7 space-y-4 text-left">
                  <div className="max-w-xl overflow-hidden space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase truncate max-w-full">
                        {s2.badge}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                        {bestOpp?.score ? `${bestOpp.score}% Fit for You` : 'Vector Calibrated'}
                      </span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-4xl font-bold text-slate-100 line-clamp-2">
                      {s2.headline}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {s2.body}
                    </p>
                  </div>

                  <div className="pt-1">
                    <MagneticButton
                      onClick={() => setActiveTab('opportunities')}
                      variant="primary"
                      className="text-xs py-3 px-7 font-bold shadow-lg shadow-peach-500/30"
                    >
                      <span>See full action plan</span>
                      <ArrowRight className="h-4 w-4" />
                    </MagneticButton>
                  </div>
                </div>

                <div className="lg:col-span-5 grid grid-cols-1 gap-3">
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Possible Earnings</span>
                    <p className="text-xl font-extrabold text-emerald-400 font-mono">
                      {bestOpp?.earningPotential || 'Market Validation Pending'}
                    </p>
                  </div>
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Target Client</span>
                    <p className="text-sm font-bold text-slate-200 font-mono">
                      {bestOpp?.customerType || bestOpp?.target_customer || 'Local Businesses & Creators'}
                    </p>
                  </div>
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Time to Working Demo</span>
                    <p className="text-xl font-bold text-slate-200 font-mono">
                      ~{bestOpp?.timeToDemo || '1-2 days'}
                    </p>
                  </div>
                </div>
              </div>
            }

            /* STATE 3 — COMBINE */
            state3Content={
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full my-auto">
                <div className="lg:col-span-5 space-y-4 text-left">
                  <div className="max-w-xl overflow-hidden space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1 rounded-full bg-burgundy-900/60 border border-crimson-500/40 text-peach-300 text-xs font-mono font-bold tracking-wider uppercase truncate max-w-full">
                        {s3.badge}
                      </span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-4xl font-bold text-slate-100 line-clamp-2">
                      {s3.headline}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {s3.body}
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('combine')}
                      className="btn-secondary text-xs py-3 px-6 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Cpu className="h-4 w-4 text-peach-400" />
                      <span>Explore Tool Combiner →</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-navy-950/70 rounded-xl border border-white/10 overflow-hidden relative h-56 sm:h-64 shadow-inner">
                  <SpatialToolWeb 
                    toolNames={requiredToolsToDisplay} 
                    activeIndices={requiredToolsToDisplay.map((_: any, i: number) => i)} 
                  />
                </div>
              </div>
            }

            /* STATE 4 — ACT */
            state4Content={
              <div className="space-y-5 w-full my-auto">
                <div className="flex items-center justify-between">
                  <span className="px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase truncate max-w-full">
                    {s4.badge}
                  </span>
                  <MagneticButton
                    onClick={() => setActiveTab('progress')}
                    variant="primary"
                    className="text-xs py-2 px-5 font-bold shadow-lg shadow-peach-500/30 hidden sm:flex"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Execute Action Plan</span>
                  </MagneticButton>
                </div>

                <div className="max-w-xl overflow-hidden space-y-1 text-left">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100 line-clamp-2">
                    {s4.headline}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                    {s4.body}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                  {actionPhasesToDisplay.map((item: any, idx: number) => (
                    <div key={idx} className="bg-navy-950/70 p-3.5 rounded-xl border border-white/10 space-y-1.5 text-left">
                      <span className="text-[10px] font-mono font-bold text-peach-400 block">{item.phase}</span>
                      <p className="text-xs text-slate-200 font-sans font-medium leading-snug">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            }

            /* STATE 5 — LEARN */
            state5Content={
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full my-auto">
                <div className="lg:col-span-6 space-y-4 text-left">
                  <div className="max-w-xl overflow-hidden space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold tracking-wider uppercase truncate max-w-full">
                        {s5.badge}
                      </span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-4xl font-bold text-slate-100 line-clamp-2">
                      {s5.headline}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {s5.body}
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('opportunities')}
                      className="btn-primary text-xs py-3 px-7 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <span>Explore Ways to Earn →</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6 grid grid-cols-2 gap-3">
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-white/10 text-center space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Match Score</span>
                    <p className="text-base font-bold text-peach-400 font-mono">{bestOpp?.score ? `${bestOpp.score}% Fit` : 'Calibrated'}</p>
                  </div>
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-white/10 text-center space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Confidence</span>
                    <p className="text-base font-bold text-emerald-400 font-mono">{bestOpp?.confidence || 'High'}</p>
                  </div>
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-white/10 text-center space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Execution Cost</span>
                    <p className="text-base font-bold text-slate-100 font-mono">{bestOpp?.startupCost === 0 ? '₹0 Upfront' : (bestOpp?.startupCost ? `₹${bestOpp.startupCost}` : '₹0 Upfront')}</p>
                  </div>
                  <div className="bg-navy-950/70 p-4 rounded-xl border border-white/10 text-center space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Feedback Status</span>
                    <p className="text-base font-bold text-amber-400 font-mono">
                      {bestOpp?.learningAdjustment ? `Adjusted (${bestOpp.learningAdjustment > 0 ? '+' : ''}${bestOpp.learningAdjustment} pts)` : 'Active Calibration'}
                    </p>
                  </div>
                </div>
              </div>
            }
          />
        )}
      </div>

      {/* SECTION 5 — WHAT YOU ACTUALLY GET */}
      <ProductOutcomes />

      {/* SECTION 6 & 7 — PRODUCT IN ACTION & WHO IS THIS FOR? */}
      <ProductInAction 
        onNavigateTab={setActiveTab}
        profile={profile}
        skills={skills}
        tools={tools}
        goals={goals}
        bestOpp={bestOpp}
        hasCompletedScan={hasCompletedScan}
      />

      {/* SECTION 8 — THE ₹0 PHILOSOPHY */}
      <ZeroCostPhilosophy />

      {/* SECTION 9 — THE CREATOR / FOUNDER STORY */}
      <CreatorStory />

      {/* SECTION 10 — FINAL INVITATION */}
      <HomeClosingCTA onEnterClick={() => setActiveTab('discover')} />
    </div>
  );
};
