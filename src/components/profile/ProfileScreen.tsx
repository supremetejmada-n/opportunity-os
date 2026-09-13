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
  AlertCircle
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});

  // Skill Modals
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [skillForm, setSkillForm] = useState<{ name: string; proficiency: SkillProficiency; confidence: number; experience_years: number; last_used: string }>({
    name: '',
    proficiency: 'Intermediate',
    confidence: 80,
    experience_years: 1,
    last_used: 'Recently'
  });

  // Tool Modals
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

  // Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<{ goal: string; priority: GoalPriority; description: string; target_timeframe: string }>({
    goal: '',
    priority: 'High',
    description: '',
    target_timeframe: '1 month'
  });

  // Interest Modal
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [interestForm, setInterestForm] = useState({ category: 'AI Tools', topic: '', industry: 'Tech' });

  // Project Modal
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

  // Skill Handlers
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

  // Tool Handlers
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

  // Goal Handler
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

  // Interest Handler
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

  // Project Handler
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
    <div className="space-y-6 py-2 max-w-5xl mx-auto">
      {/* Top Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Personal Profile Vector</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            This is what the engine knows about your skills, tools, and execution preferences.
          </p>
        </div>

        {statusMsg && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold ${
            statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-800/80 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-1 px-1.5 py-0.2 rounded text-[10px] ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
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
        <div className="panel-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              Core Identity & Constraints
            </h2>

            {!isEditingProfile ? (
              <button onClick={handleStartProfileEdit} className="btn-secondary text-xs py-1 px-3">
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Constraints</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditingProfile(false)} className="btn-secondary text-xs py-1 px-3">
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
                <button onClick={handleSaveProfile} className="btn-primary text-xs py-1 px-3">
                  <Save className="h-3.5 w-3.5" />
                  <span>Save</span>
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

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider">Evaluation Parameters</h3>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Preferred Budget</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">₹{profile?.preferred_budget ?? 0}</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={profileForm.name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={profileForm.title || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Bio / Strategy Focus</label>
                <textarea
                  rows={2}
                  value={profileForm.bio || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Preferred Upfront Budget (₹)</label>
                <input
                  type="number"
                  value={profileForm.preferred_budget ?? 0}
                  onChange={(e) => setProfileForm({ ...profileForm, preferred_budget: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Available Hours / Week</label>
                <input
                  type="number"
                  value={profileForm.available_hours_per_week ?? 20}
                  onChange={(e) => setProfileForm({ ...profileForm, available_hours_per_week: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Preferred Work Type</label>
                <select
                  value={profileForm.preferred_work_type || 'Freelance'}
                  onChange={(e) => setProfileForm({ ...profileForm, preferred_work_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Freelance">Freelance Service</option>
                  <option value="Micro-SaaS">Micro-SaaS</option>
                  <option value="Agency Service">Agency Service</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Digital Product">Digital Asset / Product</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Remote Preference</label>
                <select
                  value={profileForm.remote_preference || 'Remote Only'}
                  onChange={(e) => setProfileForm({ ...profileForm, remote_preference: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Remote Only">Remote Only</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Any">Any</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SKILLS */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Configured Skills ({skills.length})</h2>
            <button onClick={() => handleOpenSkillModal()} className="btn-primary text-xs py-1 px-3">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Skill</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.map((skill) => (
              <div key={skill.id} className="panel-card p-4 space-y-3 flex flex-col justify-between">
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
                  <button onClick={() => handleOpenSkillModal(skill)} className="p-1 text-slate-400 hover:text-slate-200">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDeleteSkill(skill.id)} className="p-1 text-slate-400 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TOOLS */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Accessible Tools ({tools.length})</h2>
            <button onClick={() => handleOpenToolModal()} className="btn-primary text-xs py-1 px-3">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Tool</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tools.map((tool) => (
              <div key={tool.id} className="panel-card p-4 space-y-3 flex flex-col justify-between">
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
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button onClick={() => handleOpenToolModal(tool)} className="p-1 text-slate-400 hover:text-slate-200">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDeleteTool(tool.id)} className="p-1 text-slate-400 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GOALS */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Strategic Goals ({goals.length})</h2>
            <button onClick={() => setIsGoalModalOpen(true)} className="btn-primary text-xs py-1 px-3">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Goal</span>
            </button>
          </div>

          <div className="space-y-2">
            {goals.map((g) => (
              <div key={g.id} className="panel-card p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge-tag ${g.priority === 'High' ? 'badge-indigo' : 'badge-slate'}`}>{g.priority}</span>
                    <h3 className="font-bold text-slate-100 text-xs">{g.goal}</h3>
                  </div>
                  {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
                </div>
                <button onClick={() => onDeleteGoal(g.id)} className="p-1 text-slate-400 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: INTERESTS */}
      {activeTab === 'interests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Target Interests ({interests.length})</h2>
            <button onClick={() => setIsInterestModalOpen(true)} className="btn-primary text-xs py-1 px-3">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Topic</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {interests.map((inst) => (
              <div key={inst.id} className="panel-card p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-indigo-400 uppercase font-mono font-semibold">{inst.category}</span>
                  <h3 className="font-bold text-slate-200 text-xs">{inst.topic}</h3>
                </div>
                <button onClick={() => onDeleteInterest(inst.id)} className="p-1 text-slate-400 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Current Projects ({projects.length})</h2>
            <button onClick={() => setIsProjectModalOpen(true)} className="btn-primary text-xs py-1 px-3">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          <div className="space-y-2">
            {projects.map((proj) => (
              <div key={proj.id} className="panel-card p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="badge-tag badge-emerald text-[10px]">{proj.status}</span>
                    <h3 className="font-bold text-slate-100 text-xs">{proj.name}</h3>
                  </div>
                  {proj.description && <p className="text-xs text-slate-400">{proj.description}</p>}
                </div>
                <button onClick={() => onDeleteProject(proj.id)} className="p-1 text-slate-400 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
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
              <button onClick={() => setIsSkillModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
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
              <button onClick={() => setIsSkillModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleSaveSkill} className="btn-primary text-xs">Save</button>
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
              <button onClick={() => setIsToolModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
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
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Capabilities (Comma separated)</label>
                <input
                  type="text"
                  value={toolForm.capabilitiesStr}
                  onChange={(e) => setToolForm({ ...toolForm, capabilitiesStr: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setIsToolModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleSaveTool} className="btn-primary text-xs">Save</button>
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
              <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={goalForm.priority}
                    onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value as GoalPriority })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Timeframe</label>
                  <input
                    type="text"
                    value={goalForm.target_timeframe}
                    onChange={(e) => setGoalForm({ ...goalForm, target_timeframe: e.target.value })}
                    placeholder="e.g. 1 month"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setIsGoalModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleSaveGoal} className="btn-primary text-xs">Save</button>
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
              <button onClick={() => setIsInterestModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
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
              <button onClick={() => setIsInterestModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleSaveInterest} className="btn-primary text-xs">Save</button>
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
              <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
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
              <button onClick={() => setIsProjectModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleSaveProject} className="btn-primary text-xs">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
