import React, { useState } from 'react';
import { 
  User, 
  Wrench, 
  Target, 
  BookOpen, 
  FolderGit2, 
  Sliders, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Zap,
  Activity,
  Cpu,
  Sparkles,
  Layers,
  Shield,
  CreditCard,
  Clock
} from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext.js';
import { 
  UserProfile, 
  UserSkill, 
  UserTool, 
  UserGoal, 
  UserInterest, 
  UserProject,
  SkillProficiency,
  ToolAccessType,
  GoalPriority
} from '../../types/index.js';
import { GlassCard } from '../ui/GlassCard.js';
import { AnimatedMetric } from '../widgets/animated-metric.js';
import { sanitizeTitleOrName, humanizeToolName, formatHumanPricing } from '../../utils/humanizer.js';

interface ProfileScreenProps {
  profile: UserProfile | null;
  skills: UserSkill[];
  tools: UserTool[];
  goals: UserGoal[];
  interests: UserInterest[];
  projects: UserProject[];
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onAddSkill: (skill: Partial<UserSkill>) => Promise<void>;
  onUpdateSkill: (id: string, updates: Partial<UserSkill>) => Promise<void>;
  onDeleteSkill: (id: string) => Promise<void>;
  onAddTool: (tool: Partial<UserTool>) => Promise<void>;
  onUpdateTool: (id: string, updates: Partial<UserTool>) => Promise<void>;
  onDeleteTool: (id: string) => Promise<void>;
  onAddGoal: (goal: Partial<UserGoal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onAddInterest: (interest: Partial<UserInterest>) => Promise<void>;
  onDeleteInterest: (id: string) => Promise<void>;
  onAddProject: (project: Partial<UserProject>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

type ProfileTab = 'overview' | 'skills' | 'tools' | 'goals' | 'interests' | 'projects';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  skills,
  tools,
  goals,
  interests,
  projects,
  onUpdateProfile,
  onAddSkill,
  onUpdateSkill,
  onDeleteSkill,
  onAddTool,
  onUpdateTool,
  onDeleteTool,
  onAddGoal,
  onDeleteGoal,
  onAddInterest,
  onDeleteInterest,
  onAddProject,
  onDeleteProject,
}) => {
  const { subscription, openSubscriptionModal } = useSubscription();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [skillForm, setSkillForm] = useState<{ name: string; proficiency: SkillProficiency; confidence: number; experience_years: number; last_used: string }>({
    name: '',
    proficiency: 'Intermediate',
    confidence: 80,
    experience_years: 1,
    last_used: 'Recently'
  });

  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<UserTool | null>(null);
  const [toolForm, setToolForm] = useState<{ name: string; category: string; access_type: ToolAccessType; cost_per_month: number; capabilitiesStr: string; familiarity: number }>({
    name: '',
    category: 'AI Model',
    access_type: 'Free Tier',
    cost_per_month: 0,
    capabilitiesStr: 'API Access, Fast Generation',
    familiarity: 85
  });

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<{ goal: string; priority: GoalPriority; description: string; target_timeframe: string }>({
    goal: '',
    priority: 'High',
    description: '',
    target_timeframe: '1 month'
  });

  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [interestForm, setInterestForm] = useState({ category: 'AI Tools', topic: '', industry: 'Tech' });

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', techStr: 'React, Gemini', status: 'In Progress' as const, relevance: 'High' });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleStartProfileEdit = () => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        title: profile.title,
        bio: profile.bio,
        preferred_budget: profile.preferred_budget,
        available_hours_per_week: profile.available_hours_per_week,
        preferred_work_type: profile.preferred_work_type,
        disliked_work: profile.disliked_work,
        remote_preference: profile.remote_preference,
        learning_tolerance: profile.learning_tolerance,
      });
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await onUpdateProfile(profileForm);
      setIsEditingProfile(false);
      showNotification('success', 'Profile updated');
    } catch (err) {
      showNotification('error', 'Failed to save profile');
    }
  };

  const handleOpenSkillModal = (skill?: UserSkill) => {
    if (skill) {
      setEditingSkill(skill);
      setSkillForm({
        name: skill.name,
        proficiency: skill.proficiency,
        confidence: skill.confidence,
        experience_years: skill.experience_years,
        last_used: skill.last_used
      });
    } else {
      setEditingSkill(null);
      setSkillForm({ name: '', proficiency: 'Intermediate', confidence: 80, experience_years: 1, last_used: 'Recently' });
    }
    setIsSkillModalOpen(true);
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim()) return;
    try {
      if (editingSkill) {
        await onUpdateSkill(editingSkill.id, skillForm);
        showNotification('success', 'Skill updated');
      } else {
        await onAddSkill(skillForm);
        showNotification('success', 'Skill added');
      }
      setIsSkillModalOpen(false);
    } catch (err) {
      showNotification('error', 'Failed to save skill');
    }
  };

  const handleOpenToolModal = (tool?: UserTool) => {
    if (tool) {
      setEditingTool(tool);
      setToolForm({
        name: tool.name,
        category: tool.category,
        access_type: tool.access_type,
        cost_per_month: tool.cost_per_month,
        capabilitiesStr: (tool.capabilities || []).join(', '),
        familiarity: tool.familiarity
      });
    } else {
      setEditingTool(null);
      setToolForm({ name: '', category: 'AI Model', access_type: 'Free Tier', cost_per_month: 0, capabilitiesStr: 'API Access', familiarity: 85 });
    }
    setIsToolModalOpen(true);
  };

  const handleSaveTool = async () => {
    if (!toolForm.name.trim()) return;
    try {
      const caps = toolForm.capabilitiesStr.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        name: toolForm.name,
        category: toolForm.category,
        access_type: toolForm.access_type,
        cost_per_month: Number(toolForm.cost_per_month),
        capabilities: caps,
        familiarity: Number(toolForm.familiarity)
      };

      if (editingTool) {
        await onUpdateTool(editingTool.id, payload);
        showNotification('success', 'Tool updated');
      } else {
        await onAddTool(payload);
        showNotification('success', 'Tool added');
      }
      setIsToolModalOpen(false);
    } catch (err) {
      showNotification('error', 'Failed to save tool');
    }
  };

  const handleSaveGoal = async () => {
    if (!goalForm.goal.trim()) return;
    try {
      await onAddGoal(goalForm);
      showNotification('success', 'Goal added');
      setIsGoalModalOpen(false);
    } catch (err) {
      showNotification('error', 'Failed to add goal');
    }
  };

  const handleSaveInterest = async () => {
    if (!interestForm.topic.trim()) return;
    try {
      await onAddInterest(interestForm);
      showNotification('success', 'Interest topic added');
      setIsInterestModalOpen(false);
    } catch (err) {
      showNotification('error', 'Failed to add interest');
    }
  };

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) return;
    try {
      const techs = projectForm.techStr.split(',').map(s => s.trim()).filter(Boolean);
      await onAddProject({
        name: projectForm.name,
        description: projectForm.description,
        technologies: techs,
        status: projectForm.status,
        relevance: projectForm.relevance
      });
      showNotification('success', 'Project added');
      setIsProjectModalOpen(false);
    } catch (err) {
      showNotification('error', 'Failed to add project');
    }
  };

  const tabs: { id: ProfileTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'overview', label: 'Overview & Constraints', icon: User },
    { id: 'skills', label: 'Skills', icon: Sliders, count: skills.length },
    { id: 'tools', label: 'Tools', icon: Wrench, count: tools.length },
    { id: 'goals', label: 'Goals', icon: Target, count: goals.length },
    { id: 'interests', label: 'Interests', icon: BookOpen, count: interests.length },
    { id: 'projects', label: 'Projects', icon: FolderGit2, count: projects.length },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Notifications Toast */}
      {statusMsg && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xl border ${
          statusMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 1. HERO DOSSIER CARD ("Builder Persona") */}
      <GlassCard variant="primary" className="p-6 sm:p-8 relative overflow-hidden space-y-6 shadow-2xl border-white/15 bg-slate-950/70 backdrop-blur-2xl">
        {/* Top Specular Liquid Glass Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/50 to-transparent pointer-events-none" />
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-peach-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Monogram Avatar with Ambient Gradient Halo */}
            <div className="relative group flex-shrink-0">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-peach-500/40 via-indigo-600/40 to-emerald-500/40 blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 via-navy-950 to-slate-900 text-peach-300 font-mono text-xl sm:text-2xl font-bold border border-white/20 shadow-2xl">
                {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                  {profile?.name || 'M. Supreme Tej'}
                </h1>
                {/* Frosted Vector Status Pill */}
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 text-[10px] font-mono font-semibold text-emerald-400 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  PROFILE ACTIVE (100%)
                </span>
              </div>

              <p className="font-mono text-xs font-semibold text-peach-400/90 tracking-wide uppercase">
                {profile?.title || 'Independent Builder & Creator'}
              </p>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {profile?.bio || 'Building zero-cost services with free tools like ChatGPT, Canva, and WhatsApp to generate steady monthly income.'}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 2. BENTO TELEMETRY GRID (Stats & Impact) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Builder Velocity */}
        <GlassCard variant="secondary" interactive className="p-6 border-white/10 hover:border-peach-500/40 min-h-[220px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 w-full mb-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-peach-400" />
              Builder Velocity
            </span>
            <span className="px-2 py-0.5 rounded bg-peach-500/10 text-peach-300 font-mono text-[10px] border border-peach-500/20">
              TELEMETRY
            </span>
          </div>

          <div className="my-auto flex flex-col justify-center w-full py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Execution Speed</span>
                <div className="font-mono text-xl sm:text-2xl font-bold text-slate-100 flex items-baseline">
                  <AnimatedMetric value={0.4} decimals={1} suffix="s" />
                  <span className="text-xs text-slate-400 font-sans ml-1">avg</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Active Workflows</span>
                <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
                  <AnimatedMetric value={projects.length + goals.length} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">System Uptime</span>
                <div className="font-mono text-xl sm:text-2xl font-bold text-slate-100">
                  <AnimatedMetric value={99.98} decimals={2} suffix="%" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Equipped Stack</span>
                <div className="font-mono text-xl sm:text-2xl font-bold text-peach-400">
                  <AnimatedMetric value={skills.length + tools.length} />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Card 2: Equipped Arsenal */}
        <GlassCard variant="secondary" interactive className="p-6 border-white/10 hover:border-peach-500/40 min-h-[220px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 w-full mb-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-indigo-400" />
              Equipped Arsenal
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono text-[10px] border border-indigo-500/20">
              ACTIVE STACK
            </span>
          </div>

          <div className="my-auto flex flex-col justify-center w-full py-2">
            {tools.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tools.slice(0, 8).map((t, idx) => (
                  <span
                    key={t.id || idx}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 hover:border-peach-500/40 hover:bg-peach-500/10 hover:-translate-y-0.5 text-xs font-mono text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-peach-400 inline-block" />
                    {t.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 space-y-2">
                <p className="text-xs text-slate-400 font-sans">No tools added yet.</p>
                <button
                  type="button"
                  onClick={() => handleOpenToolModal()}
                  className="btn-primary text-[11px] py-1.5 px-3 font-mono font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add First Tool</span>
                </button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Card 3: Domain Capabilities */}
        <GlassCard variant="secondary" interactive className="p-6 border-white/10 hover:border-peach-500/40 min-h-[220px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 w-full mb-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              Domain Capabilities
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[10px] border border-emerald-500/20">
              MATRIX BREAKDOWN
            </span>
          </div>

          <div className="my-auto flex flex-col justify-center w-full py-2">
            {skills.length === 0 && tools.length === 0 ? (
              <div className="text-center py-2 space-y-2">
                <p className="text-xs text-slate-400 font-sans">No skills or tools recorded yet.</p>
                <button
                  type="button"
                  onClick={() => handleOpenSkillModal()}
                  className="btn-secondary text-[11px] py-1.5 px-3 font-mono font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add First Skill</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Automation Capacity', pct: Math.min(100, Math.max(10, (tools.length * 15) + (skills.length * 10))), color: 'bg-emerald-500' },
                  { label: 'Frontend Craftsmanship', pct: Math.min(100, Math.max(10, (skills.length * 20))), color: 'bg-peach-500' },
                  { label: 'Data Intelligence', pct: Math.min(100, Math.max(10, (tools.length * 20))), color: 'bg-indigo-500' },
                  { label: 'System Architecture', pct: Math.min(100, Math.max(10, ((skills.length + tools.length) * 12))), color: 'bg-purple-500' },
                ].map((cap, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-sans">
                      <span className="text-slate-300 font-medium">{cap.label}</span>
                      <span className="font-mono font-bold text-slate-200">{cap.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cap.color} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${cap.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex overflow-x-auto gap-3 sm:gap-3.5 border-b border-white/10 pb-3 scrollbar-none" data-testid="profile-tabs-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`profile-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
                isActive
                  ? 'bg-peach-500 text-navy-950 font-bold shadow-md shadow-peach-500/30 border border-white/30'
                  : 'bg-navy-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-2 py-0.5 rounded text-[10px] ${
                  isActive ? 'bg-navy-950 text-peach-500 font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & CONSTRAINTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <GlassCard variant="primary" className="panel-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <User className="h-4 w-4 text-peach-500" />
              Core Identity & Constraints
            </h2>

            {!isEditingProfile ? (
              <button 
                type="button" 
                onClick={handleStartProfileEdit} 
                className="btn-secondary text-xs py-1.5 px-3.5 cursor-pointer flex items-center gap-1.5 border-white/20 hover:border-peach-500/50 shadow-md active:scale-95 transition-all"
                data-testid="edit-profile-btn"
              >
                <Edit3 className="h-3.5 w-3.5 text-peach-400" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditingProfile(false)} 
                  className="btn-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                  data-testid="cancel-profile-btn"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveProfile} 
                  className="btn-primary text-xs py-1.5 px-3.5 cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                  data-testid="save-profile-btn"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Profile</span>
                </button>
              </div>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <span className="text-slate-500 font-medium block uppercase text-[10px] tracking-wider">Profile Name</span>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">{profile?.name}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block uppercase text-[10px] tracking-wider">Title / Focus</span>
                  <p className="text-slate-300 mt-0.5">{profile?.title || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block uppercase text-[10px] tracking-wider">Bio & Philosophy</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{profile?.bio || 'Not specified'}</p>
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider">Evaluation Parameters</h3>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Preferred Budget</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      {profile?.preferred_budget !== undefined && profile?.preferred_budget !== null && !isNaN(Number(profile.preferred_budget))
                        ? Number(profile.preferred_budget) === 0
                          ? "₹0 (Free Only)"
                          : `₹${profile.preferred_budget}`
                        : "₹0 (Free Only)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Available Hours</span>
                    <span className="text-slate-200 font-mono font-bold text-sm">{profile?.available_hours_per_week ?? 20} hrs/wk</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Preferred Work</span>
                    <span className="text-indigo-300 font-medium">{profile?.preferred_work_type || 'Freelance'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Remote Preference</span>
                    <span className="text-slate-300 font-medium">{profile?.remote_preference || 'Remote Only'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Learning Tolerance</span>
                    <span className="text-slate-300 font-medium">{profile?.learning_tolerance || 'High'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Disliked Work</span>
                    <span className="text-slate-400 italic">{profile?.disliked_work || 'None specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fade-in">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Profile Name</label>
                <input
                  type="text"
                  data-testid="input-profile-name"
                  value={profileForm.name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Title / Focus</label>
                <input
                  type="text"
                  data-testid="input-profile-title"
                  value={profileForm.title || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Bio / Strategy Focus</label>
                <textarea
                  rows={2}
                  data-testid="input-profile-bio"
                  value={profileForm.bio || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Preferred Upfront Budget (₹)</label>
                <input
                  type="number"
                  data-testid="input-profile-budget"
                  value={profileForm.preferred_budget ?? 0}
                  onChange={(e) => setProfileForm({ ...profileForm, preferred_budget: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Available Hours / Week</label>
                <input
                  type="number"
                  data-testid="input-profile-hours"
                  value={profileForm.available_hours_per_week ?? 20}
                  onChange={(e) => setProfileForm({ ...profileForm, available_hours_per_week: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Preferred Work Type</label>
                <select
                  data-testid="input-profile-work-type"
                  value={profileForm.preferred_work_type || 'Freelance'}
                  onChange={(e) => setProfileForm({ ...profileForm, preferred_work_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                >
                  <option value="Freelance">Freelance</option>
                  <option value="Micro-SaaS">Micro-SaaS</option>
                  <option value="Agency Service">Agency Service</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Content / Digital Asset">Content / Digital Asset</option>
                  <option value="Any">Any</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Remote Preference</label>
                <select
                  data-testid="input-profile-remote"
                  value={profileForm.remote_preference || 'Remote Only'}
                  onChange={(e) => setProfileForm({ ...profileForm, remote_preference: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                >
                  <option value="Remote Only">Remote Only</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Any">Any</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Learning Tolerance</label>
                <select
                  data-testid="input-profile-learning"
                  value={profileForm.learning_tolerance || 'High'}
                  onChange={(e) => setProfileForm({ ...profileForm, learning_tolerance: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Disliked Work</label>
                <input
                  type="text"
                  data-testid="input-profile-disliked"
                  value={profileForm.disliked_work || ''}
                  placeholder="e.g. Cold calling, manual data entry"
                  onChange={(e) => setProfileForm({ ...profileForm, disliked_work: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-peach-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </GlassCard>

        {/* SUBSCRIPTION & MEMBERSHIP STATUS CARD */}
        <GlassCard variant="secondary" className="panel-card p-6 space-y-5 border-white/10 bg-slate-950/60 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-peach-500/10 border border-peach-500/20 text-peach-400">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-100">Subscription & Access Tier</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    subscription?.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : subscription?.status === 'trialing'
                      ? 'bg-peach-500/15 text-peach-300 border border-peach-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {subscription?.status === 'active'
                      ? 'Pro Plan Active'
                      : subscription?.status === 'trialing'
                      ? 'Free Trial (Full Access)'
                      : 'Subscription Expired'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ₹8/month • High-velocity AI opportunity radar & monetization blueprints
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openSubscriptionModal}
              data-testid="profile-manage-subscription-btn"
              className="btn-primary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{subscription?.status === 'active' ? 'Manage Membership' : 'Upgrade to Pro (₹8/mo)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Billing Rate</span>
              <p className="text-sm font-bold text-slate-100 font-mono">₹8.00 / month</p>
              <span className="text-[11px] text-slate-400">Fixed rate • No automatic renewals</span>
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Access Status</span>
              <p className="text-sm font-bold font-mono">
                {subscription?.status === 'active' ? (
                  <span className="text-emerald-400">Full Pro Entitlement</span>
                ) : subscription?.status === 'trialing' ? (
                  <span className="text-peach-300">{subscription?.trial?.remainingFormatted || 'Active'} remaining</span>
                ) : (
                  <span className="text-rose-400">Locked — Renewal Required</span>
                )}
              </p>
              <span className="text-[11px] text-slate-400">
                {subscription?.status === 'active'
                  ? `Renews manually by ${subscription.currentPeriod?.end ? new Date(subscription.currentPeriod.end).toLocaleDateString() : 'end of term'}`
                  : subscription?.status === 'trialing'
                  ? `Free trial ends ${subscription.trial?.expiresAt ? new Date(subscription.trial.expiresAt).toLocaleDateString() : 'in 3 days'}`
                  : 'Renew to regain access to Scanner & Combiner'}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Billing Provider</span>
              <p className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                <span>Razorpay Secure (UPI & Cards)</span>
              </p>
              <span className="text-[11px] text-slate-400">100% Secure • Zero hidden charges</span>
            </div>
          </div>
        </GlassCard>
      </div>
      )}

      {/* TAB 2: SKILLS using .interactive-card */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Configured Skills ({skills.length})</h2>
            <button type="button" onClick={() => handleOpenSkillModal()} className="btn-primary text-xs py-1 px-3 cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Skill</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.map((skill) => (
              <GlassCard key={skill.id} variant="secondary" className="interactive-card p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-slate-100 text-xs">{skill.name}</h3>
                    <span className="badge-tag badge-indigo text-[10px]">{skill.proficiency}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Confidence</span>
                      <span className="font-mono text-slate-200 font-semibold">{skill.confidence}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${skill.confidence}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <button type="button" onClick={() => handleOpenSkillModal(skill)} className="btn-ghost p-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => onDeleteSkill(skill.id)} className="btn-ghost p-1 text-slate-400 hover:text-red-400 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TOOLS using .interactive-card */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Accessible Tools ({tools.length})</h2>
            <button type="button" onClick={() => handleOpenToolModal()} className="btn-primary text-xs py-1 px-3 cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Tool</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tools.map((tool) => (
              <GlassCard key={tool.id} variant="secondary" className="interactive-card p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-100 text-xs">{tool.name}</h3>
                      <span className="text-[10px] text-slate-500 font-mono">{tool.category}</span>
                    </div>
                    <span className="badge-tag badge-emerald text-[10px]">{tool.access_type}</span>
                  </div>

                  {tool.capabilities && tool.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tool.capabilities.map((cap, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button type="button" onClick={() => handleOpenToolModal(tool)} className="btn-ghost p-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => onDeleteTool(tool.id)} className="btn-ghost p-1 text-slate-400 hover:text-red-400 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GOALS */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Strategic Goals ({goals.length})</h2>
            <button type="button" onClick={() => setIsGoalModalOpen(true)} className="btn-primary text-xs py-1 px-3 cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Goal</span>
            </button>
          </div>

          <div className="space-y-2">
            {goals.map((g) => (
              <GlassCard key={g.id} variant="secondary" className="interactive-card p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge-tag ${g.priority === 'High' ? 'badge-indigo' : 'badge-slate'}`}>{g.priority}</span>
                    <h3 className="font-bold text-slate-100 text-xs">{g.goal}</h3>
                  </div>
                  {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
                </div>
                <button type="button" onClick={() => onDeleteGoal(g.id)} className="btn-ghost p-1 text-slate-400 hover:text-red-400 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: INTERESTS */}
      {activeTab === 'interests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Target Interests ({interests.length})</h2>
            <button type="button" onClick={() => setIsInterestModalOpen(true)} className="btn-primary text-xs py-1 px-3 cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Topic</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {interests.map((inst) => (
              <GlassCard key={inst.id} variant="secondary" className="interactive-card p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-indigo-400 uppercase font-mono font-semibold">{inst.category}</span>
                  <h3 className="font-bold text-slate-200 text-xs">{inst.topic}</h3>
                </div>
                <button type="button" onClick={() => onDeleteInterest(inst.id)} className="btn-ghost p-1 text-slate-400 hover:text-red-400 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Current Projects ({projects.length})</h2>
            <button type="button" onClick={() => setIsProjectModalOpen(true)} className="btn-primary text-xs py-1 px-3 cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          <div className="space-y-2">
            {projects.map((proj) => (
              <GlassCard key={proj.id} variant="secondary" className="interactive-card p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="badge-tag badge-emerald text-[10px]">{proj.status}</span>
                    <h3 className="font-bold text-slate-100 text-xs">{proj.name}</h3>
                  </div>
                  {proj.description && <p className="text-xs text-slate-400">{proj.description}</p>}
                </div>
                <button type="button" onClick={() => onDeleteProject(proj.id)} className="btn-ghost p-1 text-slate-400 hover:text-red-400 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* SKILL MODAL */}
      {isSkillModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">{editingSkill ? 'Edit Skill' : 'Add Skill'}</h3>
              <button type="button" onClick={() => setIsSkillModalOpen(false)} className="btn-ghost p-1 text-slate-400 hover:text-slate-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Skill Name</label>
                <input
                  type="text"
                  value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  placeholder="e.g. Prompt Engineering, Video Clipping"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Proficiency</label>
                  <select
                    value={skillForm.proficiency}
                    onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value as SkillProficiency })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Confidence ({skillForm.confidence}%)</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={skillForm.confidence}
                    onChange={(e) => setSkillForm({ ...skillForm, confidence: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsSkillModalOpen(false)} className="btn-secondary text-xs cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveSkill} className="btn-primary text-xs cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* TOOL MODAL */}
      {isToolModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">{editingTool ? 'Edit Tool' : 'Add Tool'}</h3>
              <button type="button" onClick={() => setIsToolModalOpen(false)} className="btn-ghost p-1 text-slate-400 hover:text-slate-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tool Name</label>
                <input
                  type="text"
                  value={toolForm.name}
                  onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                  placeholder="e.g. Gemini API, Canva, CapCut"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={toolForm.category}
                    onChange={(e) => setToolForm({ ...toolForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Access Type</label>
                  <select
                    value={toolForm.access_type}
                    onChange={(e) => setToolForm({ ...toolForm, access_type: e.target.value as ToolAccessType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="Free">Free</option>
                    <option value="Free Tier">Free Tier</option>
                    <option value="Open Source">Open Source</option>
                    <option value="Self-Hosted">Self-Hosted</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsToolModalOpen(false)} className="btn-secondary text-xs cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveTool} className="btn-primary text-xs cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* GOAL MODAL */}
      {isGoalModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Add Strategic Goal</h3>
              <button type="button" onClick={() => setIsGoalModalOpen(false)} className="btn-ghost p-1 text-slate-400 hover:text-slate-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Goal Statement</label>
                <input
                  type="text"
                  value={goalForm.goal}
                  onChange={(e) => setGoalForm({ ...goalForm, goal: e.target.value })}
                  placeholder="e.g. Launch ₹0-Cost AI Service"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsGoalModalOpen(false)} className="btn-secondary text-xs cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveGoal} className="btn-primary text-xs cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* INTEREST MODAL */}
      {isInterestModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Add Interest Topic</h3>
              <button type="button" onClick={() => setIsInterestModalOpen(false)} className="btn-ghost p-1 text-slate-400 hover:text-slate-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  value={interestForm.category}
                  onChange={(e) => setInterestForm({ ...interestForm, category: e.target.value })}
                  placeholder="e.g. AI Tools"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Topic</label>
                <input
                  type="text"
                  value={interestForm.topic}
                  onChange={(e) => setInterestForm({ ...interestForm, topic: e.target.value })}
                  placeholder="e.g. Open Source Models"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsInterestModalOpen(false)} className="btn-secondary text-xs cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveInterest} className="btn-primary text-xs cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT MODAL */}
      {isProjectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Add Project</h3>
              <button type="button" onClick={() => setIsProjectModalOpen(false)} className="btn-ghost p-1 text-slate-400 hover:text-slate-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="e.g. Clipping Pipeline"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsProjectModalOpen(false)} className="btn-secondary text-xs cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveProject} className="btn-primary text-xs cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
