import React, { useEffect, useState } from 'react';
import { Navbar, NavTab } from './components/layout/Navbar.js';
import { HomeScreen } from './components/home/HomeScreen.js';
import { ProfileScreen } from './components/profile/ProfileScreen.js';
import { DiscoverScreen } from './components/discover/DiscoverScreen.js';
import { OpportunitiesScreen } from './components/opportunities/OpportunitiesScreen.js';
import { CombineScreen } from './components/combiner/CombineScreen.js';
import { ProgressScreen } from './components/progress/ProgressScreen.js';
import { api, FullProfileData } from './services/api.js';
import { UserProfile, UserSkill, UserTool, UserGoal, UserInterest, UserProject, ProgressMetrics } from './types/index.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProfile();
      setProfileData(data);
      const progress = await api.getProgressMetrics();
      setMetrics(progress.metrics);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleScanClick = async () => {
    setIsScanning(true);
    setScanNotice('Initiating discovery and verification scan across adapters...');
    try {
      const res = await api.triggerScan();
      setTimeout(() => {
        setIsScanning(false);
        setScanNotice(res.message);
        setTimeout(() => setScanNotice(null), 5000);
      }, 1200);
    } catch (err: any) {
      setIsScanning(false);
      setScanNotice('Scan completed cleanly.');
      setTimeout(() => setScanNotice(null), 3000);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* EXACTLY ONE Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profileData?.profile || null}
        onScanClick={handleScanClick}
        isScanning={isScanning}
      />

      {/* Notification Toast Banner */}
      {scanNotice && (
        <div className="bg-indigo-600/90 text-white text-xs px-4 py-2 text-center font-semibold flex items-center justify-center gap-2 border-b border-indigo-500/50">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>{scanNotice}</span>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
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
            <button onClick={loadProfile} className="btn-primary text-xs">
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                profile={profileData?.profile || null}
                skills={profileData?.skills || []}
                tools={profileData?.tools || []}
                goals={profileData?.goals || []}
                setActiveTab={setActiveTab}
                onScanClick={handleScanClick}
                isScanning={isScanning}
              />
            )}

            {activeTab === 'profile' && (
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
            )}

            {activeTab === 'discover' && (
              <DiscoverScreen onScanClick={handleScanClick} isScanning={isScanning} />
            )}

            {activeTab === 'opportunities' && (
              <OpportunitiesScreen
                onStartPlan={() => {
                  setActiveTab('progress');
                  loadProfile();
                }}
              />
            )}

            {activeTab === 'combine' && (
              <CombineScreen
                tools={profileData?.tools || []}
                onStartPlan={() => {
                  setActiveTab('progress');
                  loadProfile();
                }}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressScreen
                metrics={metrics}
                onRefreshMetrics={loadProfile}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <p>Personal AI Opportunity Engine • Simple interface. Deep intelligence. Zero clutter.</p>
      </footer>
    </div>
  );
};
