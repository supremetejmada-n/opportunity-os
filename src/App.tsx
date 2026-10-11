import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar, NavTab } from './components/layout/Navbar.js';
import { HomeScreen } from './components/home/HomeScreen.js';
import { ProfileScreen } from './components/profile/ProfileScreen.js';
import { DiscoverScreen } from './components/discover/DiscoverScreen.js';
import { OpportunitiesScreen } from './components/opportunities/OpportunitiesScreen.js';
import { CombineScreen } from './components/combiner/CombineScreen.js';
import { ProgressScreen } from './components/progress/ProgressScreen.js';
import { ScanScreen } from './components/scan/ScanScreen.js';
import { SpatialScrollProvider } from './components/ui/SpatialScrollProvider.js';
import { LenisProvider } from './components/ui/LenisProvider.js';
import { ParallaxBackdrop } from './components/layout/ParallaxBackdrop.js';
import { PresentationFrame } from './components/layout/PresentationFrame.js';
import { RetinaNoiseTexture } from './components/ui/RetinaNoiseTexture.js';
import { OpportunityDetailModal } from './components/widgets/OpportunityDetailModal.js';
import { PracticalGuideWorkspace } from './components/guide/PracticalGuideWorkspace.js';
import { api, FullProfileData, getAuthToken } from './services/api.js';
import { UserProfile, UserSkill, UserTool, UserGoal, UserInterest, UserProject, ProgressMetrics } from './types/index.js';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext.js';
import { SubscriptionModal } from './components/subscription/SubscriptionModal.js';

export interface ActiveGuideSession {
  planId?: string;
  card?: any;
  returnTab: NavTab;
}

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const { openSubscriptionModal } = useSubscription();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGuideSession, setActiveGuideSession] = useState<ActiveGuideSession | null>(null);

  // Profile State
  const [profileData, setProfileData] = useState<FullProfileData | null>(null);
  
  // Progress State
  const [metrics, setMetrics] = useState<ProgressMetrics>({
    opportunities_viewed: 0,
    opportunities_saved: 0,
    opportunities_attempted: 0,
    demos_created: 0,
    prospects_contacted: 0,
    responses_received: 0,
    clients_acquired: 0,
    revenue_earned: 0,
    hours_spent: 0
  });

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const handleNavigateTab = (tabName: NavTab) => {
    setActiveGuideSession(null);
    setActiveTab(tabName);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleOpenGuide = (session: { planId?: string; card?: any; returnTab?: NavTab }) => {
    setActiveGuideSession({
      planId: session.planId,
      card: session.card,
      returnTab: session.returnTab || activeTab,
    });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleExitGuide = () => {
    const returnTarget = activeGuideSession?.returnTab || activeTab;
    setActiveGuideSession(null);
    handleNavigateTab(returnTarget);
  };

  const loadProfile = async () => {
    if (!getAuthToken()) {
      setLoading(false);
      setProfileData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProfile();
      setProfileData(data);
      const progress = await api.getProgressMetrics();
      setMetrics(progress.metrics);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      if (err.message?.includes('Failed to load profile data') || err.message?.includes('401')) {
        setProfileData(null);
      } else {
        setError(err.message || 'Failed to connect to backend server');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    } else if (!authLoading) {
      setLoading(false);
      setProfileData(null);
    }
  }, [isAuthenticated, authLoading]);

  const handleScanClick = async () => {
    setIsScanning(true);
    setScanNotice('Initiating discovery and verification scan across adapters...');
    try {
      const res = await api.triggerScan();
      await loadProfile();
      setDataVersion(v => v + 1);
      setTimeout(() => {
        setIsScanning(false);
        const scanStatus = res.status || res.scanRecord?.status;
        if (res.success === false || scanStatus === 'failed') {
          setScanNotice(res.message || "Scan failed. Your existing discoveries remain unchanged.");
        } else if (scanStatus === 'partial') {
          setScanNotice(res.message || `Scan completed with partial results (${res.scanRecord?.items_collected || 0} items collected, some sources failed).`);
        } else {
          setScanNotice(res.message || 'Scan completed successfully.');
        }
        setTimeout(() => setScanNotice(null), 6000);
      }, 1000);
    } catch (err: any) {
      setDataVersion(v => v + 1);
      setIsScanning(false);
      if (err.message?.includes('subscription') || err.message?.includes('SUBSCRIPTION_EXPIRED') || err.message?.includes('free trial')) {
        openSubscriptionModal();
      }
      setScanNotice(`Scan failed: ${err.message || "Could not complete scan."} Existing discoveries remain unchanged.`);
      setTimeout(() => setScanNotice(null), 6000);
    }
  };

  // Profile CRUD wrappers
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    const updated = await api.updateProfile(updates);
    setProfileData(prev => prev ? { ...prev, profile: updated } : null);
  };

  const handleAddSkill = async (skill: Partial<UserSkill>) => {
    const created = await api.addSkill(skill);
    setProfileData(prev => prev ? { ...prev, skills: [...prev.skills, created] } : null);
  };

  const handleUpdateSkill = async (id: string, updates: Partial<UserSkill>) => {
    const updated = await api.updateSkill(id, updates);
    setProfileData(prev => prev ? {
      ...prev,
      skills: prev.skills.map(s => s.id === id ? updated : s)
    } : null);
  };

  const handleDeleteSkill = async (id: string) => {
    await api.deleteSkill(id);
    setProfileData(prev => prev ? {
      ...prev,
      skills: prev.skills.filter(s => s.id !== id)
    } : null);
  };

  const handleAddTool = async (tool: Partial<UserTool>) => {
    const created = await api.addTool(tool);
    setProfileData(prev => prev ? { ...prev, tools: [...prev.tools, created] } : null);
  };

  const handleUpdateTool = async (id: string, updates: Partial<UserTool>) => {
    const updated = await api.updateTool(id, updates);
    setProfileData(prev => prev ? {
      ...prev,
      tools: prev.tools.map(t => t.id === id ? updated : t)
    } : null);
  };

  const handleDeleteTool = async (id: string) => {
    await api.deleteTool(id);
    setProfileData(prev => prev ? {
      ...prev,
      tools: prev.tools.filter(t => t.id !== id)
    } : null);
  };

  const handleAddGoal = async (goal: Partial<UserGoal>) => {
    const created = await api.addGoal(goal);
    setProfileData(prev => prev ? { ...prev, goals: [...prev.goals, created] } : null);
  };

  const handleDeleteGoal = async (id: string) => {
    await api.deleteGoal(id);
    setProfileData(prev => prev ? {
      ...prev,
      goals: prev.goals.filter(g => g.id !== id)
    } : null);
  };

  const handleAddInterest = async (interest: Partial<UserInterest>) => {
    const created = await api.addInterest(interest);
    setProfileData(prev => prev ? { ...prev, interests: [...prev.interests, created] } : null);
  };

  const handleDeleteInterest = async (id: string) => {
    await api.deleteInterest(id);
    setProfileData(prev => prev ? {
      ...prev,
      interests: prev.interests.filter(i => i.id !== id)
    } : null);
  };

  const handleAddProject = async (project: Partial<UserProject>) => {
    const created = await api.addProject(project);
    setProfileData(prev => prev ? { ...prev, projects: [...prev.projects, created] } : null);
  };

  const handleDeleteProject = async (id: string) => {
    await api.deleteProject(id);
    setProfileData(prev => prev ? {
      ...prev,
      projects: prev.projects.filter(p => p.id !== id)
    } : null);
  };

  return (
    <LenisProvider>
      <SpatialScrollProvider>
        <div className="relative min-h-screen bg-[#070a0f] text-slate-100 flex flex-col font-sans overflow-x-clip">
          {/* Global Unified Atmospheric Caustics Canvas */}
          <div 
            className="fixed inset-0 z-0 pointer-events-none select-none bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(255,165,134,0.10),transparent_70%)]" 
            style={{ contain: 'strict' }} 
          />

          {/* Pillar 1: Persistent SVG Micro-Texture Overlay */}
          <RetinaNoiseTexture />

          {/* Parallax Ghost Text Backdrop drifting at 0.3x rate */}
          <ParallaxBackdrop />

          {/* Pillar 8: Floating Detached Navigation Dock */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={handleNavigateTab}
            profile={profileData?.profile || null}
            onScanClick={handleScanClick}
            isScanning={isScanning}
          />

          {/* Notification Toast Banner */}
          {scanNotice && (
            <div className="relative z-40 bg-indigo-600/90 text-white text-xs px-4 py-2 text-center font-semibold flex items-center justify-center gap-2 border-b border-indigo-500/50">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>{scanNotice}</span>
            </div>
          )}

          {/* Main Viewport Container */}
          <main className="relative z-10 flex-1 w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3 max-w-7xl mx-auto px-4 py-6">
                <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                <p className="text-xs font-semibold text-slate-400">Loading Personal AI Opportunity Engine...</p>
              </div>
            ) : error ? (
              <div className="panel-card p-8 border border-red-500/30 text-center max-w-md mx-auto my-12 space-y-4">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-100">Connection Failed</h3>
                  <p className="text-xs text-slate-400">{error}</p>
                </div>
                <button type="button" onClick={loadProfile} className="btn-primary text-xs">
                  Retry Connection
                </button>
              </div>
            ) : activeGuideSession ? (
              <PracticalGuideWorkspace
                planId={activeGuideSession.planId}
                card={activeGuideSession.card}
                returnTabLabel={
                  activeGuideSession.returnTab === 'combine' ? "Combine Tools" :
                  activeGuideSession.returnTab === 'progress' ? "Step-by-Step Guide" :
                  activeGuideSession.returnTab === 'home' ? "Home" :
                  activeGuideSession.returnTab === 'discover' ? "New AI Tools" :
                  "Ways to Earn"
                }
                onBack={handleExitGuide}
                onPlanUpdated={() => {
                  loadProfile();
                  setDataVersion(v => v + 1);
                }}
              />
            ) : (
              <div className="w-full min-h-[60vh]">
                {activeTab === 'home' && (
                  <HomeScreen
                    profile={profileData?.profile || null}
                    skills={profileData?.skills || []}
                    tools={profileData?.tools || []}
                    goals={profileData?.goals || []}
                    setActiveTab={handleNavigateTab}
                    onScanClick={handleScanClick}
                    isScanning={isScanning}
                    dataVersion={dataVersion}
                  />
                )}

                {activeTab === 'profile' && (
                  <PresentationFrame>
                    <ProfileScreen
                      profile={profileData?.profile || null}
                      skills={profileData?.skills || []}
                      tools={profileData?.tools || []}
                      goals={profileData?.goals || []}
                      interests={profileData?.interests || []}
                      projects={profileData?.projects || []}
                      onUpdateProfile={handleUpdateProfile}
                      onAddSkill={handleAddSkill}
                      onUpdateSkill={handleUpdateSkill}
                      onDeleteSkill={handleDeleteSkill}
                      onAddTool={handleAddTool}
                      onUpdateTool={handleUpdateTool}
                      onDeleteTool={handleDeleteTool}
                      onAddGoal={handleAddGoal}
                      onDeleteGoal={handleDeleteGoal}
                      onAddInterest={handleAddInterest}
                      onDeleteInterest={handleDeleteInterest}
                      onAddProject={handleAddProject}
                      onDeleteProject={handleDeleteProject}
                    />
                  </PresentationFrame>
                )}

                {activeTab === 'discover' && (
                  <PresentationFrame>
                    <DiscoverScreen 
                      onScanClick={handleScanClick} 
                      isScanning={isScanning} 
                      onNavigateTab={handleNavigateTab}
                      dataVersion={dataVersion}
                      tools={profileData?.tools || []}
                      skills={profileData?.skills || []}
                    />
                  </PresentationFrame>
                )}

                {activeTab === 'opportunities' && (
                  <PresentationFrame>
                    <OpportunitiesScreen
                      tools={profileData?.tools || []}
                      skills={profileData?.skills || []}
                      onNavigateTab={handleNavigateTab}
                      onOpenGuide={(card) => handleOpenGuide({ card, returnTab: 'opportunities' })}
                      onStartPlan={(id) => {
                        handleOpenGuide({ planId: id, returnTab: 'opportunities' });
                        loadProfile();
                      }}
                      dataVersion={dataVersion}
                    />
                  </PresentationFrame>
                )}

                {activeTab === 'combine' && (
                  <PresentationFrame>
                    <CombineScreen
                      tools={profileData?.tools || []}
                      onNavigateTab={handleNavigateTab}
                      onOpenGuide={(card) => handleOpenGuide({ card, returnTab: 'combine' })}
                      onStartPlan={(id) => {
                        if (id) handleOpenGuide({ planId: id, returnTab: 'combine' });
                        loadProfile();
                      }}
                      dataVersion={dataVersion}
                    />
                  </PresentationFrame>
                )}

                {activeTab === 'progress' && (
                  <PresentationFrame>
                    <ProgressScreen
                      metrics={metrics}
                      onRefreshMetrics={loadProfile}
                      onContinuePlan={(id) => handleOpenGuide({ planId: id, returnTab: 'progress' })}
                      onNavigateTab={handleNavigateTab}
                      dataVersion={dataVersion}
                    />
                  </PresentationFrame>
                )}
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="relative z-10 border-t border-slate-800/40 bg-transparent backdrop-blur-md py-5 text-center text-xs text-slate-500">
            <p>Personal AI Opportunity Engine • Simple interface. Deep intelligence. Zero clutter.</p>
          </footer>

          {/* Authentication Modal */}
          <AuthModal />

          {/* Subscription Modal */}
          <SubscriptionModal />
        </div>
      </SpatialScrollProvider>
    </LenisProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </AuthProvider>
  );
};
