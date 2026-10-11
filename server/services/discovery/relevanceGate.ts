import { dbGet, dbAll } from '../../db/sqlite.js';
import { NormalizedDiscovery } from './types.js';

export interface UserProfileContext {
  id: string;
  name: string;
  preferredBudget: number;
  availableHoursPerWeek: number;
  preferredWorkType: string;
  dislikedWork: string[];
  learningTolerance: string;
  skills: Array<{ id: string; name: string; proficiency: string; confidence: number }>;
  tools: Array<{ id: string; name: string; category: string; accessType: string; costPerMonth: number; capabilities: string[] }>;
  goals: Array<{ id: string; goal: string; priority: string; description: string }>;
  interests: Array<{ id: string; category: string; topic: string; industry: string }>;
  projects: Array<{ id: string; name: string; description: string; technologies: string[]; status: string }>;
  
  skillNames: Set<string>;
  existingToolNames: Set<string>;
  interestTopics: Set<string>;
  goalKeywords: Set<string>;
  projectTechs: Set<string>;
  isZeroBudget: boolean;
  isIncompleteProfile: boolean;
}

export interface RelevanceConnection {
  type: 'skill' | 'tool' | 'goal' | 'interest' | 'project';
  targetName: string;
  description: string;
}

export interface RelevanceEvaluationResult {
  passed: boolean;
  connections: RelevanceConnection[];
  score: number;
  scoreBreakdown: {
    interestGoalMatch: number;
    practicalUsefulness: number;
    skillExperienceFit: number;
    toolSynergy: number;
    costAccessFit: number;
  };
  rejectionReason?: string;
  whyItMatchesYou?: string;
  whatItHelpsYouDo?: string;
  whyItIsUsefulNow?: string;
  whatYouNeedToUseIt?: string;
  costExplanation?: string;
  nextStep?: string;
}

/**
 * Loads and normalizes the user's complete saved profile from SQLite.
 */
export async function getUserProfileContext(userId?: string): Promise<UserProfileContext> {
  let profileRow: any = null;
  if (userId) {
    profileRow = await dbGet('SELECT * FROM profiles WHERE user_id = ? LIMIT 1;', [userId]);
  }

  // Safe empty baseline context when unauthenticated or user has not created a profile yet
  if (!profileRow) {
    return {
      id: userId || 'unauthenticated',
      name: 'Builder',
      preferredBudget: 0,
      availableHoursPerWeek: 20,
      preferredWorkType: 'Freelance',
      dislikedWork: [],
      learningTolerance: 'High',
      skills: [],
      tools: [],
      goals: [],
      interests: [],
      projects: [],
      skillNames: new Set<string>(),
      existingToolNames: new Set<string>(),
      interestTopics: new Set<string>(),
      goalKeywords: new Set<string>(),
      projectTechs: new Set<string>(),
      isZeroBudget: true,
      isIncompleteProfile: true
    };
  }

  const skills = await dbAll<any>('SELECT * FROM skills WHERE profile_id = ?;', [profileRow.id]);
  const toolsRaw = await dbAll<any>('SELECT * FROM tools WHERE profile_id = ?;', [profileRow.id]);
  const goals = await dbAll<any>('SELECT * FROM goals WHERE profile_id = ?;', [profileRow.id]);
  const interests = await dbAll<any>('SELECT * FROM interests WHERE profile_id = ?;', [profileRow.id]);
  const projectsRaw = await dbAll<any>('SELECT * FROM projects WHERE profile_id = ?;', [profileRow.id]);

  const tools = toolsRaw.map(t => ({
    ...t,
    capabilities: typeof t.capabilities === 'string' ? JSON.parse(t.capabilities || '[]') : (t.capabilities || [])
  }));

  const projects = projectsRaw.map(p => ({
    ...p,
    technologies: typeof p.technologies === 'string' ? JSON.parse(p.technologies || '[]') : (p.technologies || [])
  }));

  const skillNames = new Set(skills.map(s => (s.name || '').toLowerCase().trim()));
  const existingToolNames = new Set(tools.map(t => (t.name || '').toLowerCase().trim()));
  const interestTopics = new Set(interests.map(i => `${i.topic || ''} ${i.category || ''} ${i.industry || ''}`.toLowerCase().trim()));
  const goalKeywords = new Set(goals.map(g => `${g.goal || ''} ${g.description || ''}`.toLowerCase().trim()));
  
  const projectTechs = new Set<string>();
  projects.forEach(p => {
    (p.technologies || []).forEach((tech: string) => projectTechs.add(tech.toLowerCase().trim()));
    projectTechs.add((p.name || '').toLowerCase().trim());
  });

  const dislikedWorkArr = (profileRow.disliked_work || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const isZeroBudget = profileRow.preferred_budget === 0;
  const isIncompleteProfile = skills.length === 0 && tools.length === 0 && goals.length === 0 && interests.length === 0 && projects.length === 0;

  return {
    id: profileRow.id,
    name: profileRow.name,
    preferredBudget: profileRow.preferred_budget ?? 0,
    availableHoursPerWeek: profileRow.available_hours_per_week ?? 20,
    preferredWorkType: profileRow.preferred_work_type || 'Freelance',
    dislikedWork: dislikedWorkArr,
    learningTolerance: profileRow.learning_tolerance || 'High',
    skills,
    tools,
    goals,
    interests,
    projects,
    skillNames,
    existingToolNames,
    interestTopics,
    goalKeywords,
    projectTechs,
    isZeroBudget,
    isIncompleteProfile
  };
}

/**
 * Strict Profile Relevance Gate & Deterministic Scoring Engine.
 * Evaluates candidate discoveries against the user's saved profile context.
 */
export function evaluateProfileRelevance(
  candidate: NormalizedDiscovery,
  profile: UserProfileContext
): RelevanceEvaluationResult {
  const connections: RelevanceConnection[] = [];

  // Text content of candidate for keyword matching
  const candidateText = `${candidate.title} ${candidate.description} ${candidate.category} ${candidate.capabilities.join(' ')}`.toLowerCase();

  // 1. Check Interest Match
  profile.interests.forEach(inst => {
    const topic = (inst.topic || '').toLowerCase().trim();
    const category = (inst.category || '').toLowerCase().trim();
    if (topic && topic.length > 2 && candidateText.includes(topic)) {
      connections.push({
        type: 'interest',
        targetName: inst.topic,
        description: `Matches your saved interest topic "${inst.topic}"`
      });
    } else if (category && category.length > 2 && candidateText.includes(category)) {
      connections.push({
        type: 'interest',
        targetName: inst.category,
        description: `Matches your saved interest category "${inst.category}"`
      });
    }
  });

  // 2. Check Goal Match
  profile.goals.forEach(g => {
    const goalText = (g.goal || '').toLowerCase().trim();
    const words = goalText.split(/\s+/).filter(w => w.length > 3);
    const matchCount = words.filter(w => candidateText.includes(w)).length;
    if (matchCount >= Math.min(2, words.length) && words.length > 0) {
      connections.push({
        type: 'goal',
        targetName: g.goal,
        description: `Helps fulfill your saved goal: "${g.goal}"`
      });
    }
  });

  // 3. Check Project Match
  profile.projects.forEach(p => {
    const projText = `${p.name} ${p.description} ${(p.technologies || []).join(' ')}`.toLowerCase();
    const pWords = (p.name || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hasTechMatch = (p.technologies || []).some(t => candidateText.includes(t.toLowerCase()));
    const hasNameMatch = pWords.some(w => candidateText.includes(w));

    if (hasTechMatch || hasNameMatch) {
      connections.push({
        type: 'project',
        targetName: p.name,
        description: `Extends tech stack for active project "${p.name}"`
      });
    }
  });

  // 4. Check Tool Match (Extends existing tool)
  profile.tools.forEach(t => {
    const toolName = (t.name || '').toLowerCase().trim();
    if (toolName && toolName.length > 2 && candidateText.includes(toolName)) {
      connections.push({
        type: 'tool',
        targetName: t.name,
        description: `Works with your existing tool "${t.name}"`
      });
    }
  });

  // 5. Check Skill Match (Helps apply or build on existing skill)
  profile.skills.forEach(s => {
    const skillName = (s.name || '').toLowerCase().trim();
    if (skillName && skillName.length > 2 && candidateText.includes(skillName)) {
      connections.push({
        type: 'skill',
        targetName: s.name,
        description: `Leverages your saved skill in ${s.name}`
      });
    }
  });

  // HARD GATE 1: Zero-Budget Constraint
  if (profile.isZeroBudget) {
    const isFree = candidate.freeTier || candidate.openSource || candidate.openWeight || candidate.selfHostable || candidate.pricingStatus === 'genuinely_free' || candidate.pricingStatus === 'free_tier' || candidate.pricingStatus === 'open_source_self_hostable';
    const isPaidOnly = candidate.pricingStatus === 'paid_only';

    if (isPaidOnly || (!isFree && candidate.pricingStatus === 'paid_only')) {
      return {
        passed: false,
        connections,
        score: 0,
        scoreBreakdown: { interestGoalMatch: 0, practicalUsefulness: 0, skillExperienceFit: 0, toolSynergy: 0, costAccessFit: 0 },
        rejectionReason: 'Failed zero-budget cost constraint (tool requires paid subscription with no free tier).'
      };
    }
  }

  // HARD GATE 2: Disliked Work Constraint
  if (profile.dislikedWork.length > 0) {
    const isDisliked = profile.dislikedWork.some(d => candidateText.includes(d));
    if (isDisliked) {
      return {
        passed: false,
        connections,
        score: 0,
        scoreBreakdown: { interestGoalMatch: 0, practicalUsefulness: 0, skillExperienceFit: 0, toolSynergy: 0, costAccessFit: 0 },
        rejectionReason: 'Rejected due to user disliked work preference.'
      };
    }
  }

  // HARD GATE 3: Must have at least 1 concrete connection
  if (connections.length === 0) {
    return {
      passed: false,
      connections: [],
      score: 0,
      scoreBreakdown: { interestGoalMatch: 0, practicalUsefulness: 0, skillExperienceFit: 0, toolSynergy: 0, costAccessFit: 0 },
      rejectionReason: 'No concrete connection found to saved interests, goals, skills, tools, or projects.'
    };
  }

  // Deduplicate connection types for scoring
  const uniqueConnectionTypes = new Set(connections.map(c => c.type));
  const primaryConnection = connections[0];

  // -------------------------------------------------------------
  // Deterministic Scoring Engine (0 to 100)
  // -------------------------------------------------------------
  let interestGoalMatch = 0;
  if (uniqueConnectionTypes.has('goal')) interestGoalMatch += 18;
  if (uniqueConnectionTypes.has('interest')) interestGoalMatch += 12;
  interestGoalMatch = Math.min(30, interestGoalMatch);

  let practicalUsefulness = 0;
  if (uniqueConnectionTypes.has('project')) practicalUsefulness += 15;
  if (candidate.capabilities.length > 0) practicalUsefulness += 10;
  practicalUsefulness = Math.min(25, practicalUsefulness);

  let skillExperienceFit = 0;
  if (uniqueConnectionTypes.has('skill')) skillExperienceFit += 15;
  if (candidate.verificationStatus === 'verified') skillExperienceFit += 5;
  skillExperienceFit = Math.min(20, skillExperienceFit);

  let toolSynergy = 0;
  if (uniqueConnectionTypes.has('tool')) toolSynergy += 15;
  toolSynergy = Math.min(15, toolSynergy);

  let costAccessFit = 0;
  if (candidate.freeTier || candidate.openSource) costAccessFit += 10;
  else costAccessFit += 5;
  costAccessFit = Math.min(10, costAccessFit);

  const totalScore = interestGoalMatch + practicalUsefulness + skillExperienceFit + toolSynergy + costAccessFit;

  // Derive truthful user-centric explanations
  const whyItMatchesYou = primaryConnection ? primaryConnection.description : `Matches your profile interests.`;
  const whatItHelpsYouDo = candidate.capabilities.length > 0
    ? `Provides ${candidate.capabilities.slice(0, 3).join(', ')} capabilities.`
    : `Use this tool for ${candidate.title}.`;
  
  const whyItIsUsefulNow = connections.find(c => c.type === 'project' || c.type === 'goal')?.description 
    || `Directly applicable to your current workflow.`;

  const whatYouNeedToUseIt = candidate.openSource 
    ? `Open-source repository access.` 
    : (candidate.apiAvailable ? `Free tier or API access.` : `Web browser access.`);

  const costExplanation = candidate.openSource 
    ? `Free & Open Source` 
    : (candidate.freeTier ? `Free tier available` : `Free to start`);

  const nextStep = candidate.url ? `Explore resource link` : `Add to your tool stack`;

  return {
    passed: true,
    connections,
    score: totalScore,
    scoreBreakdown: {
      interestGoalMatch,
      practicalUsefulness,
      skillExperienceFit,
      toolSynergy,
      costAccessFit
    },
    whyItMatchesYou,
    whatItHelpsYouDo,
    whyItIsUsefulNow,
    whatYouNeedToUseIt,
    costExplanation,
    nextStep
  };
}
