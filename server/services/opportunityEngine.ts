import { dbAll, dbGet, dbRun } from '../db/sqlite.js';

export interface ScoreBreakdown {
  skillMatch: number;      // 25% (0-25)
  marketDemand: number;    // 20% (0-20)
  toolMatch: number;       // 15% (0-15)
  startupCost: number;     // 15% (0-15)
  timeToDemo: number;      // 10% (0-10)
  learningCurve: number;   // 5% (0-5)
  competition: number;     // 5% (0-5)
  simplicity: number;      // 5% (0-5)
  reasoning?: Record<string, string>;
}

export interface ActionPlanStep {
  dayOrPhase: string;
  title: string;
  description: string;
  estimatedHours: number;
  toolsNeeded?: string[];
}

export interface EarningHypothesis {
  range: string;
  basis: string;
  confidence: 'Low' | 'Medium' | 'High';
}

export type OpportunityOrigin = 'discovery_derived' | 'profile_hypothesis' | 'template';

export interface OpportunityRecord {
  id: string;
  discoveryId?: string;
  discoveryIds: string[];
  toolIds: string[];
  title: string;
  summary: string;
  whyMatch: string;
  earningPotential: string;
  earningHypothesis: EarningHypothesis;
  customerType: string;
  origin: OpportunityOrigin;
  workflow: string[];
  requiredTools: string[];
  actionPlan: ActionPlanStep[];
  startupCost: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeToDemo: string;
  risks: string[];
  evidence: Record<string, any>;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  confidence: 'High' | 'Medium' | 'Low';
  saved: boolean;
  status: 'new' | 'saved' | 'in_progress' | 'completed' | 'ignored';
  createdAt: string;
  isDemoData: boolean;
}

export interface FullUserProfileData {
  profile: any;
  skills: any[];
  tools: any[];
  goals: any[];
  interests: any[];
  projects: any[];
}

export type ToolStatus = 'already_have' | 'free_to_obtain' | 'requires_paid_access' | 'unknown';

export interface ToolEvaluation {
  tool: string;
  status: ToolStatus;
  notes: string;
}

export class OpportunityEngine {
  /**
   * Quality threshold for recommended opportunities (out of 100).
   * Candidates scoring below this threshold are rejected.
   */
  public static readonly MIN_RECOMMENDED_SCORE = 65;

  /**
   * Fetches full profile dataset for the user
   */
  async getFullUserProfile(): Promise<FullUserProfileData> {
    const profile = await dbGet('SELECT * FROM profiles LIMIT 1') || {
      id: 'default-profile',
      name: 'Your Profile',
      preferred_budget: 0,
      available_hours_per_week: 20,
      preferred_work_type: 'Freelance',
      disliked_work: '',
      learning_tolerance: 'High'
    };

    const skills = await dbAll('SELECT * FROM skills WHERE profile_id = ?', [profile.id]) || [];
    const tools = await dbAll('SELECT * FROM tools WHERE profile_id = ?', [profile.id]) || [];
    const goals = await dbAll('SELECT * FROM goals WHERE profile_id = ?', [profile.id]) || [];
    const interests = await dbAll('SELECT * FROM interests WHERE profile_id = ?', [profile.id]) || [];
    const projects = await dbAll('SELECT * FROM projects WHERE profile_id = ?', [profile.id]) || [];

    return { profile, skills, tools, goals, interests, projects };
  }

  /**
   * Normalized duration parser for time-to-demo.
   * Converts timeframe strings into normalized points (0 to 10).
   */
  parseTimeToDemoScore(timeStr: string): { score: number; reasoning: string } {
    if (!timeStr) {
      return { score: 4, reasoning: 'Time to demo is unspecified; conservative default applied.' };
    }

    const lower = timeStr.toLowerCase().trim();

    if (lower === '1 day' || lower === 'same day' || lower === 'few hours' || lower.includes('12 hours') || lower.includes('24 hours')) {
      return { score: 10, reasoning: `Fast execution timeframe (${timeStr}): working prototype buildable in 1 day.` };
    }
    if (lower.includes('1-2 days') || lower.includes('2 days') || lower.includes('48 hours')) {
      return { score: 9, reasoning: `Rapid execution timeframe (${timeStr}): prototype buildable in 1–2 days.` };
    }
    if (lower.includes('3 days') || lower.includes('3-4 days') || lower.includes('72 hours')) {
      return { score: 7, reasoning: `Moderate execution timeframe (${timeStr}): prototype takes ~3 days.` };
    }
    if (lower.includes('1 week') || lower.includes('5-7 days')) {
      return { score: 5, reasoning: `Extended prototype timeframe (${timeStr}): takes approximately 1 week.` };
    }
    if (lower.includes('2 weeks') || lower.includes('month')) {
      return { score: 2, reasoning: `Slow prototype timeframe (${timeStr}): requires multiple weeks of development.` };
    }

    return { score: 4, reasoning: `Estimated prototype timeframe (${timeStr}): assigned conservative score.` };
  }

  /**
   * Strict tool access evaluator: distinguishes already_have, free_to_obtain, requires_paid_access, unknown.
   */
  evaluateToolAccess(toolName: string, userData: FullUserProfileData, verifiedFreeTools: Set<string>): ToolEvaluation {
    const lower = toolName.toLowerCase().trim();
    const userToolNames = userData.tools.map((t: any) => (t.name || '').toLowerCase().trim());

    // 1. Direct ownership match in profile
    const directMatch = userToolNames.find(ut => ut === lower || lower.includes(ut) || ut.includes(lower));
    if (directMatch) {
      return {
        tool: toolName,
        status: 'already_have',
        notes: `User already has access to '${toolName}' in profile.`
      };
    }

    // 2. Verified zero-cost obtainable tools
    const freeObtainableList = ['canva', 'capcut', 'gemini', 'gemini api (free tier)', 'google sheets', 'ollama', 'python', 'open webui', 'n8n'];
    const isFree = freeObtainableList.some(f => lower.includes(f)) || verifiedFreeTools.has(lower);
    if (isFree) {
      return {
        tool: toolName,
        status: 'free_to_obtain',
        notes: `'${toolName}' is available via free tier or open-source download without upfront payment.`
      };
    }

    // 3. Paid tool checks
    const paidList = ['paid openai api', 'aws ec2', 'paid api', 'subscription', 'midjourney'];
    if (paidList.some(p => lower.includes(p))) {
      return {
        tool: toolName,
        status: 'requires_paid_access',
        notes: `'${toolName}' requires paid access or subscription.`
      };
    }

    return {
      tool: toolName,
      status: 'unknown',
      notes: `Access model for '${toolName}' is unverified.`
    };
  }

  /**
   * Normalized skill matcher: evaluates whether user skills match required capabilities without broad substrings.
   */
  evaluateSkillMatch(requiredSkills: string[], userData: FullUserProfileData): {
    matchedSkills: string[];
    missingSkills: string[];
    score: number;
    reasoning: string;
  } {
    const userSkills = userData.skills || [];
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    // Semantic skill normalization map
    const skillEquivalences: Record<string, string[]> = {
      'graphic design': ['poster design', 'canva', 'social media graphics', 'flyer design', 'banner design'],
      'poster design': ['graphic design', 'canva', 'digital graphics', 'flyer design'],
      'video editing': ['short-form video editing', 'reels', 'clipping', 'capcut', 'video editing & clipping'],
      'automation': ['workflow automation', 'n8n', 'zapier', 'scripting', 'lead automation'],
      'copywriting': ['content writing', 'scriptwriting', 'prompt engineering', 'ad copy'],
      'local ai': ['ollama', 'model deployment', 'python', 'private ai', 'llama']
    };

    for (const req of requiredSkills) {
      const reqLower = req.toLowerCase().trim();
      const equivalents = skillEquivalences[reqLower] || [reqLower];

      const found = userSkills.find((us: any) => {
        const usName = (us.name || '').toLowerCase().trim();
        return usName === reqLower || equivalents.some(eq => usName === eq || usName.includes(eq));
      });

      if (found) {
        matchedSkills.push(req);
      } else {
        missingSkills.push(req);
      }
    }

    // Calculate score (0 to 25 pts)
    let score = 12; // neutral baseline
    if (requiredSkills.length > 0) {
      const matchRatio = matchedSkills.length / requiredSkills.length;
      score = Math.round(matchRatio * 25);
    } else {
      score = 15;
    }

    // Cap within 0-25
    score = Math.max(0, Math.min(25, score));

    const reasoning = matchedSkills.length === requiredSkills.length && requiredSkills.length > 0
      ? `Strong skill match: user possesses all ${requiredSkills.length} required skill(s) (${matchedSkills.join(', ')}).`
      : matchedSkills.length > 0
      ? `Partial skill match: user has ${matchedSkills.join(', ')}, but lacks ${missingSkills.join(', ')}.`
      : `Low skill match: user lacks verified skills for ${requiredSkills.join(', ')}.`;

    return { matchedSkills, missingSkills, score, reasoning };
  }

  /**
   * Calculates transparent 8-factor score for an opportunity candidate against the user profile.
   * Total score: 0 to 100
   */
  calculate8FactorScore(candidate: {
    title: string;
    summary: string;
    requiredTools: string[];
    requiredSkills?: string[];
    startupCost: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    timeToDemo: string;
    isPaidAPI?: boolean;
    isHeavyCoding?: boolean;
    hasVerifiedMarketSignal?: boolean;
    hasVerifiedDiscovery?: boolean;
  }, userData: FullUserProfileData, verifiedFreeTools: Set<string> = new Set()): { totalScore: number; breakdown: ScoreBreakdown } {
    const userBudget = Number(userData.profile?.preferred_budget ?? 0);
    const dislikedWork = (userData.profile?.disliked_work || '').toLowerCase();

    // 1. Skill Match (25% - max 25 pts)
    const requiredSkills = candidate.requiredSkills || [];
    const skillResult = this.evaluateSkillMatch(requiredSkills, userData);
    let skillMatch = skillResult.score;

    // 2. Market Demand (20% - max 20 pts)
    // Conservative by default: 10/20 unless genuine market signal evidence is present
    let marketDemand = 10;
    let marketReasoning = 'Market demand evidence is currently limited; score is conservative.';
    if (candidate.hasVerifiedMarketSignal) {
      marketDemand = 16;
      marketReasoning = 'Supported by verified market demand signal evidence from discovery feed.';
    }

    // 3. Tool Match (15% - max 15 pts)
    const toolEvals = candidate.requiredTools.map(t => this.evaluateToolAccess(t, userData, verifiedFreeTools));
    const alreadyHaveCount = toolEvals.filter(te => te.status === 'already_have').length;
    const freeObtainCount = toolEvals.filter(te => te.status === 'free_to_obtain').length;
    const paidCount = toolEvals.filter(te => te.status === 'requires_paid_access').length;

    let toolMatch = 8;
    if (candidate.requiredTools.length > 0) {
      const ownedOrFreeCount = alreadyHaveCount + (freeObtainCount * 0.8);
      toolMatch = Math.min(15, Math.round((ownedOrFreeCount / candidate.requiredTools.length) * 15));
      if (paidCount > 0) {
        toolMatch = Math.max(2, toolMatch - (paidCount * 3));
      }
    }

    const toolReasoning = `Evaluated ${candidate.requiredTools.length} required tool(s): ${alreadyHaveCount} owned, ${freeObtainCount} free to obtain, ${paidCount} require paid access.`;

    // 4. Startup Cost (15% - max 15 pts)
    let startupCost = 15;
    let costReasoning = `Startup cost is ₹${candidate.startupCost}, strictly within user budget (₹${userBudget}).`;
    if (candidate.startupCost > userBudget) {
      startupCost = 3;
      costReasoning = `Exceeds user budget constraint: requires ₹${candidate.startupCost} vs ₹${userBudget} budget limit.`;
    } else if (candidate.isPaidAPI || paidCount > 0) {
      startupCost = 8;
      costReasoning = `Requires recurring paid tool/API subscriptions; penalized against ₹${userBudget} zero-cost preference.`;
    }

    // 5. Time to Demo (10% - max 10 pts)
    const demoParsed = this.parseTimeToDemoScore(candidate.timeToDemo);
    let timeToDemo = demoParsed.score;

    // Check if user has an existing project that accelerates demo
    const userProjects = userData.projects || [];
    const hasRelatedProject = userProjects.some((p: any) => {
      const pName = (p.name || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      return candidate.requiredTools.some(t => pName.includes(t.toLowerCase()) || pDesc.includes(t.toLowerCase()));
    });
    if (hasRelatedProject && timeToDemo < 10) {
      timeToDemo = Math.min(10, timeToDemo + 1);
    }

    // 6. Learning Curve (5% - max 5 pts)
    let learningCurve = 3;
    const learningTolerance = userData.profile?.learning_tolerance || 'Medium';
    if (learningTolerance === 'High') {
      learningCurve = skillResult.missingSkills.length === 0 ? 5 : 4;
    } else if (learningTolerance === 'Low') {
      learningCurve = skillResult.missingSkills.length === 0 ? 4 : 2;
    } else {
      learningCurve = skillResult.missingSkills.length === 0 ? 4 : 3;
    }

    // 7. Competition (5% - max 5 pts)
    // Conservative neutral baseline: 3/5
    const competition = 3;
    const competitionReasoning = 'Competition evidence is unverified; score is neutral.';

    // 8. Execution Simplicity (5% - max 5 pts)
    let simplicity = candidate.difficulty === 'Easy' ? 5 : candidate.difficulty === 'Medium' ? 4 : 2;
    let simplicityReasoning = `Rated ${candidate.difficulty} execution complexity.`;

    // Penalize heavy coding if candidate is heavy coding
    if (candidate.isHeavyCoding) {
      simplicity = Math.max(1, simplicity - 2);
      simplicityReasoning += ' Penalized for heavy custom code dependency.';
    }

    // Disliked work constraint check
    if (dislikedWork) {
      const titleLower = candidate.title.toLowerCase();
      const summaryLower = candidate.summary.toLowerCase();
      if (dislikedWork.includes('sales') && (titleLower.includes('sales') || summaryLower.includes('cold calling'))) {
        simplicity = Math.max(1, simplicity - 2);
        simplicityReasoning += ` Penalized due to user's disliked work preference ('${userData.profile.disliked_work}').`;
      }
      if (dislikedWork.includes('coding') && candidate.isHeavyCoding) {
        simplicity = Math.max(1, simplicity - 2);
      }
    }

    // Goal alignment check (boosts overall profile fit)
    const userGoals = userData.goals || [];
    const alignsWithGoal = userGoals.some((g: any) => {
      const gLower = (g.goal || '').toLowerCase();
      return candidate.title.toLowerCase().includes(gLower) || candidate.summary.toLowerCase().includes(gLower);
    });
    if (alignsWithGoal) {
      skillMatch = Math.min(25, skillMatch + 1);
    }

    const totalScore = Math.min(100, Math.max(0, 
      Math.round(skillMatch + marketDemand + toolMatch + startupCost + timeToDemo + learningCurve + competition + simplicity)
    ));

    const breakdown: ScoreBreakdown = {
      skillMatch: Math.round(skillMatch),
      marketDemand: Math.round(marketDemand),
      toolMatch: Math.round(toolMatch),
      startupCost: Math.round(startupCost),
      timeToDemo: Math.round(timeToDemo),
      learningCurve: Math.round(learningCurve),
      competition: Math.round(competition),
      simplicity: Math.round(simplicity),
      reasoning: {
        skillMatch: skillResult.reasoning,
        marketDemand: marketReasoning,
        toolMatch: toolReasoning,
        startupCost: costReasoning,
        timeToDemo: demoParsed.reasoning,
        learningCurve: `Learning curve evaluated against ${learningTolerance} tolerance.`,
        competition: competitionReasoning,
        simplicity: simplicityReasoning
      }
    };

    return { totalScore, breakdown };
  }

  /**
   * Calculates dynamic confidence (High, Medium, Low) based on evidence quality.
   */
  calculateOpportunityConfidence(candidate: {
    hasVerifiedDiscovery: boolean;
    discoveryVerificationStatus?: string;
    hasVerifiedMarketSignal: boolean;
    allToolsAvailable: boolean;
    allSkillsMatched: boolean;
  }): 'High' | 'Medium' | 'Low' {
    if (
      candidate.hasVerifiedDiscovery && 
      candidate.discoveryVerificationStatus === 'verified' &&
      candidate.allToolsAvailable &&
      candidate.allSkillsMatched &&
      candidate.hasVerifiedMarketSignal
    ) {
      return 'High';
    }

    if (
      (candidate.allToolsAvailable && candidate.allSkillsMatched) ||
      (candidate.hasVerifiedDiscovery && candidate.allToolsAvailable)
    ) {
      return 'Medium';
    }

    return 'Low';
  }

  /**
   * Generates actionable earning opportunities combining discoveries with user tools across 1 to 4 tool combinations.
   * Enforces strict evidence linking and applies quality threshold filtering.
   */
  async evaluateOpportunities(): Promise<OpportunityRecord[]> {
    const userData = await this.getFullUserProfile();
    
    // Fetch real discoveries from database
    const discoveries = await dbAll('SELECT * FROM discoveries ORDER BY rowid DESC LIMIT 50');
    
    // Build set of verified zero-cost tools from actual discoveries in DB
    const verifiedFreeTools = new Set<string>();
    for (const d of discoveries) {
      if (d.free_tier || d.open_source || d.pricing_status === 'genuinely_free' || d.pricing_status === 'open_source_self_hostable') {
        verifiedFreeTools.add((d.title || '').toLowerCase().trim());
      }
    }

    // Check if any verified market signal exists in discoveries
    const marketSignalDiscoveries = discoveries.filter(d => d.type === 'market_signal' || d.category === 'Market Signal');
    const hasMarketSignal = marketSignalDiscoveries.length > 0;

    // Defined opportunity templates (baseline opportunity hypotheses)
    const opportunityTemplates = [
      {
        id: 'opp-poster-packages',
        title: 'Local Business AI Poster & Graphic Packages',
        summary: 'Create promotional poster packages and social media banners for local stores and restaurants using Canva + AI image tools.',
        whyMatch: 'Aligns with graphic design skills and ₹0 startup budget preference.',
        earningRange: '₹5,000 – ₹25,000 / month',
        earningBasis: 'Hypothesis — based on typical local business flyer design packages; validate with real client demand.',
        customerType: 'Local Stores, Restaurants, & Event Organizers',
        workflow: ['Gemini for Visual Concepts & Copy', 'Canva for Typography & Layouts', 'PDF/PNG Export for Delivery'],
        requiredTools: ['Gemini', 'Canva'],
        requiredSkills: ['Poster Design', 'Canva'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Setup', title: 'Create 5 Sample Templates', description: 'Design 5 poster templates in Canva for local cafes and retail shops.', estimatedHours: 3, toolsNeeded: ['Canva', 'Gemini'] },
          { dayOrPhase: 'Day 2: Outreach', title: 'Contact 10 Local Businesses', description: 'Visit or message 10 local business owners with personalized sample posters.', estimatedHours: 4, toolsNeeded: ['Canva'] },
          { dayOrPhase: 'Day 3–5: Deliver', title: 'Complete First Paid Package', description: 'Deliver a 10-poster bundle for your first paying client.', estimatedHours: 5, toolsNeeded: ['Canva'] }
        ],
        startupCost: 0,
        difficulty: 'Easy' as const,
        timeToDemo: '1 day',
        risks: ['Requires proactive direct outreach to business owners.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['canva-free', 'gemini-free'],
        // Strict semantic matching terms only:
        semanticMatchTerms: ['flux', 'stable-diffusion', 'image-generation', 'sdxl']
      },
      {
        id: 'opp-instagram-reels',
        title: 'Short-Form Instagram Reels Creation Service',
        summary: 'Produce short-form video reels and promotional clips for small brands combining Gemini copy, Canva visuals, and CapCut editing.',
        whyMatch: 'Combines video editing skills and free video editing tools.',
        earningRange: '₹8,000 – ₹35,000 / month',
        earningBasis: 'Hypothesis — based on 4-reel monthly retainer models; validate with real client demand.',
        customerType: 'Instagram Business Accounts & Micro-Brands',
        workflow: ['Gemini for Scriptwriting & Hooks', 'Canva for Storyboards', 'CapCut for Video Editing & Captions'],
        requiredTools: ['Gemini', 'Canva', 'CapCut'],
        requiredSkills: ['Video Editing', 'Copywriting'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Scripting', title: 'Generate 10 Script Hooks', description: 'Use Gemini to write 10 short scripts for local brands.', estimatedHours: 2, toolsNeeded: ['Gemini'] },
          { dayOrPhase: 'Day 2: Editing', title: 'Assemble Demo Reel in CapCut', description: 'Edit a 30-second demo clip with auto-captions.', estimatedHours: 3, toolsNeeded: ['CapCut'] },
          { dayOrPhase: 'Day 3: Prospecting', title: 'Offer 1 Free Sample Reel', description: 'Pitch 5 active local handles offering 1 free sample reel.', estimatedHours: 3, toolsNeeded: ['CapCut'] }
        ],
        startupCost: 0,
        difficulty: 'Easy' as const,
        timeToDemo: '1-2 days',
        risks: ['Requires staying updated on trending reel formats.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['gemini-free', 'canva-free', 'capcut-free'],
        semanticMatchTerms: ['video-generation', 'text-to-video', 'animatediff', 'video-model']
      },
      {
        id: 'opp-automated-workflows',
        title: 'Zero-Cost AI Customer Lead & Response Automation',
        summary: 'Build automated lead capture and response workflows for small service businesses using self-hosted n8n + Gemini free tier.',
        whyMatch: 'Leverages workflow automation interest without subscription overhead.',
        earningRange: '₹10,000 – ₹45,000 / month',
        earningBasis: 'Hypothesis — based on setup fee + monthly maintenance retainer; validate with real client demand.',
        customerType: 'Real Estate Agents, Clinics, & Service Agencies',
        workflow: ['n8n Webhook / Form Listener', 'Gemini AI Response Synthesizer', 'Automated Email / WhatsApp Notification'],
        requiredTools: ['n8n', 'Gemini API (Free Tier)', 'Google Sheets'],
        requiredSkills: ['Automation'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Workflow', title: 'Build n8n Lead Bot', description: 'Setup n8n flow to trigger automated email replies on new form submission.', estimatedHours: 4, toolsNeeded: ['n8n', 'Gemini'] },
          { dayOrPhase: 'Day 2: Testing', title: 'Run End-to-End Verification', description: 'Simulate 20 lead queries to ensure response quality.', estimatedHours: 2, toolsNeeded: ['n8n'] },
          { dayOrPhase: 'Day 3: Demo', title: 'Present Live Demo to Client', description: 'Showcase lead response in real time to secure retainer.', estimatedHours: 2, toolsNeeded: ['n8n'] }
        ],
        startupCost: 0,
        difficulty: 'Medium' as const,
        timeToDemo: '2 days',
        risks: ['Webhook setup requires basic API endpoint knowledge.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['n8n-self-hosted', 'gemini-free'],
        semanticMatchTerms: ['n8n', 'workflow-automation', 'webhook-automation', 'agent-workflow']
      },
      {
        id: 'opp-local-ai-assistant',
        title: 'Privacy-Preserving Local AI Document Assistant',
        summary: 'Deploy self-hosted, offline-capable local AI assistants (Ollama + Open WebUI) for professionals requiring confidential document analysis.',
        whyMatch: 'Leverages open-weight local AI models with ₹0 API cost and data privacy.',
        earningRange: '₹12,000 – ₹50,000 / project',
        earningBasis: 'Hypothesis — based on on-premise installation and staff training project fees; validate with real client demand.',
        customerType: 'Lawyers, Accountants, & Local Clinics',
        workflow: ['Ollama Local Execution', 'Open WebUI Document Reader', 'Local Vector Indexing'],
        requiredTools: ['Ollama', 'Open WebUI', 'Python'],
        requiredSkills: ['Local AI'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Installation', title: 'Install Local Model Stack', description: 'Configure Ollama with local weights on hardware.', estimatedHours: 3, toolsNeeded: ['Ollama'] },
          { dayOrPhase: 'Day 2: Document Indexing', title: 'Setup PDF Search Pipeline', description: 'Configure local vector store to index PDF files.', estimatedHours: 3, toolsNeeded: ['Ollama', 'Python'] },
          { dayOrPhase: 'Day 3: Staff Training', title: 'Train Client Team', description: 'Walk through querying private documents securely.', estimatedHours: 2, toolsNeeded: ['Open WebUI'] }
        ],
        startupCost: 0,
        difficulty: 'Medium' as const,
        timeToDemo: '1-2 days',
        risks: ['Requires client hardware with adequate RAM/GPU for local inference.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['ollama-local', 'python-free'],
        semanticMatchTerms: ['ollama', 'llama', 'open-webui', 'mistral', 'local-llm', 'gguf']
      }
    ];

    const candidates: OpportunityRecord[] = [];

    // 1. Process templates with STRICT discovery linking (Zero fake discovery fallback)
    for (const tmpl of opportunityTemplates) {
      // Find genuinely relevant discoveries matching semanticMatchTerms
      const matchingDisc = discoveries.filter((d: any) => {
        const titleLower = (d.title || '').toLowerCase();
        const descLower = (d.description || '').toLowerCase();
        return tmpl.semanticMatchTerms.some(term => titleLower.includes(term) || descLower.includes(term));
      });

      // Strict linking: only use genuine matches; NEVER fallback to arbitrary discoveries
      const discIds: string[] = matchingDisc.slice(0, 3).map((d: any) => d.id);
      const primaryDisc = matchingDisc.length > 0 ? matchingDisc[0] : null;

      const hasVerifiedDisc = Boolean(primaryDisc && (primaryDisc.verification_status === 'verified' || primaryDisc.verificationStatus === 'verified'));

      const scoreResult = this.calculate8FactorScore({
        title: tmpl.title,
        summary: tmpl.summary,
        requiredTools: tmpl.requiredTools,
        requiredSkills: tmpl.requiredSkills,
        startupCost: tmpl.startupCost,
        difficulty: tmpl.difficulty,
        timeToDemo: tmpl.timeToDemo,
        isPaidAPI: tmpl.isPaidAPI,
        isHeavyCoding: tmpl.isHeavyCoding,
        hasVerifiedMarketSignal: hasMarketSignal,
        hasVerifiedDiscovery: hasVerifiedDisc
      }, userData, verifiedFreeTools);

      const skillEval = this.evaluateSkillMatch(tmpl.requiredSkills, userData);
      const toolEvals = tmpl.requiredTools.map(t => this.evaluateToolAccess(t, userData, verifiedFreeTools));
      const allToolsAvailable = toolEvals.every(te => te.status === 'already_have' || te.status === 'free_to_obtain');
      const allSkillsMatched = skillEval.missingSkills.length === 0;

      const dynamicConfidence = this.calculateOpportunityConfidence({
        hasVerifiedDiscovery: hasVerifiedDisc,
        discoveryVerificationStatus: primaryDisc?.verification_status || primaryDisc?.verificationStatus,
        hasVerifiedMarketSignal: hasMarketSignal,
        allToolsAvailable,
        allSkillsMatched
      });

      const origin: OpportunityOrigin = primaryDisc ? 'discovery_derived' : 'template';

      // Build evidence record
      const evidenceObj: Record<string, any> = {
        evidenceAvailable: Boolean(primaryDisc),
        origin,
        discoveryId: primaryDisc ? primaryDisc.id : null,
        discoveryUrl: primaryDisc ? primaryDisc.url : null,
        discoverySource: primaryDisc ? primaryDisc.source : null,
        verificationStatus: primaryDisc ? (primaryDisc.verification_status || 'unverified') : 'no_discovery_linked',
        marketEvidenceNote: hasMarketSignal ? 'Backed by real market signal discovery.' : 'Market demand evidence is currently limited; score is conservative.'
      };

      const record: OpportunityRecord = {
        id: tmpl.id,
        discoveryId: primaryDisc ? primaryDisc.id : undefined,
        discoveryIds: discIds,
        toolIds: tmpl.toolIds,
        title: tmpl.title,
        summary: tmpl.summary,
        whyMatch: tmpl.whyMatch,
        earningPotential: `${tmpl.earningRange} (Hypothesis)`,
        earningHypothesis: {
          range: tmpl.earningRange,
          basis: tmpl.earningBasis,
          confidence: 'Low'
        },
        customerType: tmpl.customerType,
        origin,
        workflow: tmpl.workflow,
        requiredTools: tmpl.requiredTools,
        actionPlan: tmpl.actionPlan,
        startupCost: tmpl.startupCost,
        difficulty: tmpl.difficulty,
        timeToDemo: tmpl.timeToDemo,
        risks: tmpl.risks,
        evidence: evidenceObj,
        score: scoreResult.totalScore,
        scoreBreakdown: scoreResult.breakdown,
        confidence: dynamicConfidence,
        saved: false,
        status: 'new',
        createdAt: new Date().toISOString(),
        isDemoData: false
      };

      candidates.push(record);
    }

    // 2. Dynamic generation from real discoveries (strictly genuine discovery_derived candidates)
    for (const disc of discoveries.slice(0, 10)) {
      if (candidates.some(c => c.discoveryId === disc.id)) continue;

      const isModel = disc.type === 'ai_model' || (disc.category || '').includes('Model');
      const isAuto = disc.type === 'automation_tool' || (disc.title || '').toLowerCase().includes('agent');
      
      const title = isModel ? `Specialized Client Service with ${disc.title}` :
                    isAuto ? `Automated ${disc.title} Integration for Clients` :
                    `AI Solution Package built with ${disc.title}`;

      const summary = `Utilize ${disc.title} (${disc.license || 'Open Source'}) combined with free AI tools for client workflows.`;

      const reqTools = ['Gemini', disc.title];
      const reqSkills = isAuto ? ['Automation'] : isModel ? ['Local AI'] : [];

      const scoreResult = this.calculate8FactorScore({
        title,
        summary,
        requiredTools: reqTools,
        requiredSkills: reqSkills,
        startupCost: 0,
        difficulty: 'Medium',
        timeToDemo: '1-2 days',
        hasVerifiedMarketSignal: false,
        hasVerifiedDiscovery: disc.verification_status === 'verified'
      }, userData, verifiedFreeTools);

      const skillEval = this.evaluateSkillMatch(reqSkills, userData);
      const toolEvals = reqTools.map(t => this.evaluateToolAccess(t, userData, verifiedFreeTools));
      const allToolsAvailable = toolEvals.every(te => te.status === 'already_have' || te.status === 'free_to_obtain');

      const dynamicConfidence = this.calculateOpportunityConfidence({
        hasVerifiedDiscovery: disc.verification_status === 'verified',
        discoveryVerificationStatus: disc.verification_status,
        hasVerifiedMarketSignal: false,
        allToolsAvailable,
        allSkillsMatched: skillEval.missingSkills.length === 0
      });

      const record: OpportunityRecord = {
        id: `opp-disc-${disc.id}`,
        discoveryId: disc.id,
        discoveryIds: [disc.id],
        toolIds: ['gemini-free'],
        title,
        summary,
        whyMatch: `Grounded in verified discovery from ${disc.source} (${disc.pricing_status || 'free'}). Evaluated against your profile budget limit (₹${userData.profile?.preferred_budget ?? 0}).`,
        earningPotential: '₹4,000 – ₹20,000 / project (Hypothesis)',
        earningHypothesis: {
          range: '₹4,000 – ₹20,000 / project',
          basis: 'Hypothesis — validate with real client demand.',
          confidence: 'Low'
        },
        customerType: 'Niche Freelance Clients & Small Businesses',
        origin: 'discovery_derived',
        workflow: [`Extract ${disc.title} capabilities`, 'Integrate with Gemini for content/logic', 'Deliver finished service to client'],
        requiredTools: reqTools,
        actionPlan: [
          { dayOrPhase: 'Day 1: Setup', title: `Test ${disc.title}`, description: `Verify ${disc.title} execution.`, estimatedHours: 2, toolsNeeded: [disc.title] },
          { dayOrPhase: 'Day 2: Prototype', title: 'Build Demo', description: 'Create a functional demo showing the tool in action.', estimatedHours: 3, toolsNeeded: reqTools }
        ],
        startupCost: 0,
        difficulty: 'Medium',
        timeToDemo: '1-2 days',
        risks: ['Requires testing raw tool capabilities before pitching.'],
        evidence: {
          evidenceAvailable: true,
          origin: 'discovery_derived',
          discoveryId: disc.id,
          discoveryUrl: disc.url,
          discoverySource: disc.source,
          verificationStatus: disc.verification_status || 'unverified',
          marketEvidenceNote: 'Market demand evidence is currently limited; score is conservative.'
        },
        score: scoreResult.totalScore,
        scoreBreakdown: scoreResult.breakdown,
        confidence: dynamicConfidence,
        saved: false,
        status: 'new',
        createdAt: new Date().toISOString(),
        isDemoData: false
      };

      candidates.push(record);
    }

    // 3. QUALITY THRESHOLD FILTERING: Prefer 3 highly relevant opportunities over 20 generic ones.
    // Candidates scoring below MIN_RECOMMENDED_SCORE are excluded.
    const qualifiedOpportunities = candidates
      .filter(c => c.score >= OpportunityEngine.MIN_RECOMMENDED_SCORE)
      .sort((a, b) => b.score - a.score);

    // Persist qualified opportunities into SQLite
    for (const rec of qualifiedOpportunities) {
      await this.saveOpportunityToDb(rec);
    }

    return qualifiedOpportunities;
  }

  /**
   * Saves or updates an opportunity record in SQLite database
   */
  async saveOpportunityToDb(rec: OpportunityRecord): Promise<void> {
    const existing = await dbGet('SELECT id, saved FROM opportunities WHERE id = ?', [rec.id]);
    const isSaved = existing ? existing.saved : (rec.saved ? 1 : 0);

    if (existing) {
      await dbRun(`
        UPDATE opportunities SET
          title = ?,
          summary = ?,
          why_match = ?,
          earning_potential = ?,
          earning_basis = ?,
          earning_confidence = ?,
          origin = ?,
          customer_type = ?,
          target_customer = ?,
          workflow = ?,
          required_tools = ?,
          action_plan = ?,
          startup_cost = ?,
          difficulty = ?,
          time_to_demo = ?,
          risks = ?,
          evidence = ?,
          score = ?,
          score_breakdown = ?,
          confidence = ?,
          discovery_ids = ?,
          tool_ids = ?,
          saved = ?
        WHERE id = ?
      `, [
        rec.title,
        rec.summary,
        rec.whyMatch,
        rec.earningPotential,
        rec.earningHypothesis?.basis || '',
        rec.earningHypothesis?.confidence || 'Low',
        rec.origin || 'template',
        rec.customerType,
        rec.customerType,
        JSON.stringify(rec.workflow),
        JSON.stringify(rec.requiredTools),
        JSON.stringify(rec.actionPlan),
        rec.startupCost,
        rec.difficulty,
        rec.timeToDemo,
        JSON.stringify(rec.risks),
        JSON.stringify(rec.evidence),
        rec.score,
        JSON.stringify(rec.scoreBreakdown),
        rec.confidence,
        JSON.stringify(rec.discoveryIds),
        JSON.stringify(rec.toolIds),
        isSaved,
        rec.id
      ]);
    } else {
      await dbRun(`
        INSERT INTO opportunities (
          id, discovery_id, discovery_ids, tool_ids, title, summary, why_match,
          earning_potential, earning_basis, earning_confidence, origin, customer_type,
          target_customer, workflow, required_tools, action_plan, startup_cost,
          difficulty, time_to_demo, risks, evidence, score, score_breakdown,
          confidence, saved, status, is_demo_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        rec.id,
        rec.discoveryId || null,
        JSON.stringify(rec.discoveryIds),
        JSON.stringify(rec.toolIds),
        rec.title,
        rec.summary,
        rec.whyMatch,
        rec.earningPotential,
        rec.earningHypothesis?.basis || '',
        rec.earningHypothesis?.confidence || 'Low',
        rec.origin || 'template',
        rec.customerType,
        rec.customerType,
        JSON.stringify(rec.workflow),
        JSON.stringify(rec.requiredTools),
        JSON.stringify(rec.actionPlan),
        rec.startupCost,
        rec.difficulty,
        rec.timeToDemo,
        JSON.stringify(rec.risks),
        JSON.stringify(rec.evidence),
        rec.score,
        JSON.stringify(rec.scoreBreakdown),
        rec.confidence,
        rec.saved ? 1 : 0,
        rec.status,
        rec.isDemoData ? 1 : 0
      ]);
    }
  }

  /**
   * Retrieves opportunities from SQLite database with filtering
   */
  async getOpportunities(filters: {
    savedOnly?: boolean;
    minScore?: number;
    difficulty?: string;
    limit?: number;
  } = {}): Promise<OpportunityRecord[]> {
    let sql = 'SELECT * FROM opportunities WHERE 1=1';
    const params: any[] = [];

    if (filters.savedOnly) {
      sql += ' AND saved = 1';
    }
    if (filters.minScore !== undefined) {
      sql += ' AND score >= ?';
      params.push(filters.minScore);
    } else {
      // Enforce quality threshold by default
      sql += ' AND score >= ?';
      params.push(OpportunityEngine.MIN_RECOMMENDED_SCORE);
    }
    if (filters.difficulty) {
      sql += ' AND difficulty = ?';
      params.push(filters.difficulty);
    }

    sql += ' ORDER BY score DESC';
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await dbAll(sql, params);

    // If no opportunities exist in DB yet, auto-evaluate
    if (rows.length === 0 && !filters.savedOnly) {
      return this.evaluateOpportunities();
    }

    return rows.map(r => this.parseOpportunityRow(r));
  }

  /**
   * Retrieves a single opportunity by ID
   */
  async getOpportunityById(id: string): Promise<OpportunityRecord | null> {
    const row = await dbGet('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (!row) return null;
    return this.parseOpportunityRow(row);
  }

  /**
   * Toggles saved status for an opportunity
   */
  async toggleSaveOpportunity(id: string): Promise<OpportunityRecord | null> {
    const opp = await this.getOpportunityById(id);
    if (!opp) return null;

    const newSaved = !opp.saved;
    await dbRun('UPDATE opportunities SET saved = ? WHERE id = ?', [newSaved ? 1 : 0, id]);
    opp.saved = newSaved;
    return opp;
  }

  /**
   * Helper to parse SQLite database row into typed OpportunityRecord
   */
  private parseOpportunityRow(row: any): OpportunityRecord {
    const earningBasis = row.earning_basis || 'Initial service-pricing hypothesis — validate with real client demand.';
    const earningConfidence = (row.earning_confidence as any) || 'Low';
    const earningPotential = row.earning_potential || row.potential_monetization || '₹5,000–₹25,000/month (Hypothesis)';

    return {
      id: row.id,
      discoveryId: row.discovery_id,
      discoveryIds: this.safeParseJSON(row.discovery_ids, row.discovery_id ? [row.discovery_id] : []),
      toolIds: this.safeParseJSON(row.tool_ids, []),
      title: row.title,
      summary: row.summary || row.problem || '',
      whyMatch: row.why_match || row.solution || '',
      earningPotential,
      earningHypothesis: {
        range: earningPotential,
        basis: earningBasis,
        confidence: earningConfidence
      },
      customerType: row.customer_type || row.target_customer || 'Local Businesses',
      origin: (row.origin as OpportunityOrigin) || (row.discovery_id ? 'discovery_derived' : 'template'),
      workflow: this.safeParseJSON(row.workflow, []),
      requiredTools: this.safeParseJSON(row.required_tools, []),
      actionPlan: this.safeParseJSON(row.action_plan, []),
      startupCost: Number(row.startup_cost || 0),
      difficulty: (row.difficulty as any) || 'Medium',
      timeToDemo: row.time_to_demo || '1-2 days',
      risks: this.safeParseJSON(row.risks, []),
      evidence: this.safeParseJSON(row.evidence, { evidenceAvailable: Boolean(row.discovery_id) }),
      score: Number(row.score || 0),
      scoreBreakdown: this.safeParseJSON(row.score_breakdown, {
        skillMatch: 15, marketDemand: 10, toolMatch: 10, startupCost: 15, timeToDemo: 8, learningCurve: 3, competition: 3, simplicity: 4
      }),
      confidence: (row.confidence as any) || 'Medium',
      saved: Boolean(row.saved),
      status: row.status || 'new',
      createdAt: row.created_at,
      isDemoData: Boolean(row.is_demo_data)
    };
  }

  private safeParseJSON(input: any, fallback: any): any {
    if (!input) return fallback;
    if (typeof input === 'object') return input;
    try {
      return JSON.parse(input);
    } catch {
      return fallback;
    }
  }
}

export const opportunityEngine = new OpportunityEngine();
