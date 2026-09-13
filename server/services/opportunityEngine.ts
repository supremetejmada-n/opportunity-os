import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import { aiRouter } from './aiRouter.js';

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

export interface OpportunityRecord {
  id: string;
  discoveryId?: string;
  discoveryIds: string[];
  toolIds: string[];
  title: string;
  summary: string;
  whyMatch: string;
  earningPotential: string;
  customerType: string;
  workflow: string[];
  requiredTools: string[];
  actionPlan: ActionPlanStep[];
  startupCost: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeToDemo: string;
  risks: string[];
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

export class OpportunityEngine {
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
   * Calculates transparent 8-factor score for an opportunity candidate against the user profile.
   * Total score: 0 to 100
   */
  calculate8FactorScore(candidate: {
    title: string;
    summary: string;
    requiredTools: string[];
    missingSkills?: string[];
    startupCost: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    timeToDemo: string;
    isPaidAPI?: boolean;
    isHeavyCoding?: boolean;
  }, userData: FullUserProfileData): { totalScore: number; breakdown: ScoreBreakdown } {
    const userSkillNames = userData.skills.map((s: any) => (s.name || '').toLowerCase());
    const userToolNames = userData.tools.map((t: any) => (t.name || '').toLowerCase());
    const userBudget = Number(userData.profile?.preferred_budget ?? 0);

    // 1. Skill Match (25%) - max 25 pts
    let skillMatch = 15; // default baseline
    const matchesSkill = userSkillNames.some(s => 
      candidate.title.toLowerCase().includes(s) || 
      candidate.summary.toLowerCase().includes(s) ||
      s.includes('design') || s.includes('ai') || s.includes('canva') || s.includes('automation')
    );
    if (matchesSkill) skillMatch = 24;
    if (candidate.missingSkills && candidate.missingSkills.length > 0) {
      skillMatch = Math.max(10, skillMatch - (candidate.missingSkills.length * 4));
    }

    // 2. Market Demand (20%) - max 20 pts
    let marketDemand = 16;
    const highDemandTerms = ['local business', 'poster', 'instagram', 'reel', 'automation', 'content', 'lead', 'client'];
    if (highDemandTerms.some(term => candidate.title.toLowerCase().includes(term) || candidate.summary.toLowerCase().includes(term))) {
      marketDemand = 19;
    }

    // 3. Tool Match (15%) - max 15 pts
    let toolMatch = 10;
    const reqToolsLower = candidate.requiredTools.map(t => t.toLowerCase());
    const matchedToolsCount = reqToolsLower.filter(t => 
      userToolNames.some(ut => ut.includes(t) || t.includes(ut)) ||
      t.includes('canva') || t.includes('gemini') || t.includes('capcut') || t.includes('free')
    ).length;
    if (matchedToolsCount > 0) {
      toolMatch = Math.min(15, 10 + (matchedToolsCount * 2.5));
    }

    // 4. Startup Cost (15%) - max 15 pts
    let startupCost = 15; // Default rewards ₹0 upfront capital
    if (candidate.startupCost > userBudget) {
      startupCost = 5;
    }
    if (candidate.isPaidAPI) {
      startupCost -= 5;
    }

    // 5. Time to Demo (10%) - max 10 pts
    let timeToDemo = 10;
    if (candidate.timeToDemo.includes('3') || candidate.timeToDemo.includes('week')) {
      timeToDemo = 6;
    }

    // 6. Learning Curve (5%) - max 5 pts
    let learningCurve = 4;
    if (userData.profile?.learning_tolerance === 'High') learningCurve = 5;

    // 7. Competition (5%) - max 5 pts
    let competition = 4;
    if (candidate.title.toLowerCase().includes('local') || candidate.title.toLowerCase().includes('niche')) {
      competition = 5;
    }

    // 8. Execution Simplicity (5%) - max 5 pts
    let simplicity = 4;
    if (candidate.difficulty === 'Easy') simplicity = 5;
    if (candidate.difficulty === 'Hard') simplicity = 2;

    // Penalize heavy coding if candidate requires heavy coding and user has no dev skills
    if (candidate.isHeavyCoding) {
      simplicity = Math.max(1, simplicity - 2);
      skillMatch = Math.max(8, skillMatch - 5);
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
        skillMatch: `Matched user skills (${userData.skills.length} listed).`,
        marketDemand: `Assessed high commercial demand for service type.`,
        toolMatch: `Leverages available free/open-source tools.`,
        startupCost: `Evaluated against ₹${userBudget} budget constraint.`,
        timeToDemo: `Fast prototype build timeframe (${candidate.timeToDemo}).`,
        learningCurve: `Evaluated against ${userData.profile?.learning_tolerance || 'High'} learning tolerance.`,
        competition: `Niche market positioning vs competitors.`,
        simplicity: `Execution complexity rated as ${candidate.difficulty}.`
      }
    };

    return { totalScore, breakdown };
  }

  /**
   * Generates actionable earning opportunities combining discoveries with user tools across 1 to 4 tool combinations.
   */
  async evaluateOpportunities(): Promise<OpportunityRecord[]> {
    const userData = await this.getFullUserProfile();
    
    // Fetch discoveries from database
    const discoveries = await dbAll('SELECT * FROM discoveries ORDER BY rowid DESC LIMIT 30');
    
    const userToolNames = userData.tools.map((t: any) => t.name);

    // Defined templates for high-impact opportunities prioritizing zero investment, local models, freelancing, AI services, poster design, and automation
    const opportunityTemplates = [
      {
        id: 'opp-poster-packages',
        title: 'Local Business AI Poster & Graphic Packages',
        summary: 'Create high-converting promotional poster packages and social media banners for local stores, restaurants, and events using AI image models + Canva.',
        whyMatch: 'Directly aligns with your graphic design skills, zero-budget constraint, and preference for quick freelance deliverables.',
        earningPotential: '₹5,000 – ₹25,000 / month',
        customerType: 'Local Stores, Restaurants, & Event Organizers',
        workflow: ['Open-Source Image Generator / Gemini for Visual Ideas', 'Canva for Typography & Branding Layouts', 'PDF & PNG Export for Print/Digital Delivery'],
        requiredTools: ['Gemini', 'Canva', 'Open-Source AI Model'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Setup', title: 'Create 5 Sample Templates', description: 'Design 5 poster templates in Canva for local cafes and retail shops.', estimatedHours: 3, toolsNeeded: ['Canva', 'Gemini'] },
          { dayOrPhase: 'Day 2: Outreach', title: 'Contact 10 Local Businesses', description: 'Visit or message 10 local business owners with personalized sample posters.', estimatedHours: 4, toolsNeeded: ['Canva'] },
          { dayOrPhase: 'Day 3–5: Deliver', title: 'Complete First Paid Package', description: 'Deliver a 10-poster bundle for your first paying client.', estimatedHours: 5, toolsNeeded: ['Canva'] }
        ],
        startupCost: 0,
        difficulty: 'Easy' as const,
        timeToDemo: '1 day',
        risks: ['Requires proactive outreach to local business owners.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['canva-free', 'gemini-free'],
        discoveryMatchKey: 'image'
      },
      {
        id: 'opp-instagram-reels',
        title: 'Short-Form Instagram Reels Creation Service',
        summary: 'Produce automated short-form video reels and promotional clips for small brand handles combining Gemini copy, Canva visuals, and CapCut editing.',
        whyMatch: 'Perfect 3-tool combination using free tools to serve high-demand social media marketing needs.',
        earningPotential: '₹8,000 – ₹35,000 / month',
        customerType: 'Instagram Business Accounts & Micro-Brands',
        workflow: ['Gemini for Scriptwriting & Hooks', 'Canva for Storyboard Layouts', 'CapCut for Video Editing & Captions'],
        requiredTools: ['Gemini', 'Canva', 'CapCut'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Scripting', title: 'Generate 10 Viral Script Hooks', description: 'Use Gemini to write 10 short scripts for local gym or fashion handles.', estimatedHours: 2, toolsNeeded: ['Gemini'] },
          { dayOrPhase: 'Day 2: Editing', title: 'Assemble Demo Reel in CapCut', description: 'Edit a 30-second high-energy demo clip with auto-captions.', estimatedHours: 3, toolsNeeded: ['CapCut'] },
          { dayOrPhase: 'Day 3: Prospecting', title: 'Offer 1 Free Sample Reel', description: 'Pitch 5 active local handles offering 1 free custom sample reel.', estimatedHours: 3, toolsNeeded: ['CapCut'] }
        ],
        startupCost: 0,
        difficulty: 'Easy' as const,
        timeToDemo: '1-2 days',
        risks: ['Requires staying updated on trending audio and viral reel formats.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['gemini-free', 'canva-free', 'capcut-free'],
        discoveryMatchKey: 'video'
      },
      {
        id: 'opp-automated-workflows',
        title: 'Zero-Cost AI Customer Lead & Response Automation',
        summary: 'Build simple automated lead capture and response workflows for small service businesses using n8n + Gemini free tier.',
        whyMatch: 'Capitalizes on automation interest without recurring subscription overhead.',
        earningPotential: '₹10,000 – ₹45,000 / month',
        customerType: 'Real Estate Agents, Clinics, & Service Agencies',
        workflow: ['n8n Webhook / Form Listener', 'Gemini AI Response Synthesizer', 'Automated Email / WhatsApp Lead Dispatch'],
        requiredTools: ['n8n', 'Gemini API (Free Tier)', 'Google Sheets'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Workflow', title: 'Build n8n Self-Hosted Lead Bot', description: 'Setup n8n flow to trigger automated AI email replies on new form submission.', estimatedHours: 4, toolsNeeded: ['n8n', 'Gemini'] },
          { dayOrPhase: 'Day 2: Testing', title: 'Run End-to-End Verification', description: 'Simulate 20 lead queries to ensure zero-latency response quality.', estimatedHours: 2, toolsNeeded: ['n8n'] },
          { dayOrPhase: 'Day 3: Demo', title: 'Present Live Demo to Real Estate Client', description: 'Showcase lead response in real time to secure monthly retainer.', estimatedHours: 2, toolsNeeded: ['n8n'] }
        ],
        startupCost: 0,
        difficulty: 'Medium' as const,
        timeToDemo: '2 days',
        risks: ['Webhook setup requires basic API endpoint knowledge.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['n8n-self-hosted', 'gemini-free'],
        discoveryMatchKey: 'automation'
      },
      {
        id: 'opp-local-ai-assistant',
        title: 'Privacy-Preserving Local AI Document Assistant',
        summary: 'Deploy self-hosted, offline-capable local AI assistants (Ollama + Open WebUI) for legal, financial, or medical professionals requiring confidential document analysis.',
        whyMatch: 'Directly leverages open-weight local AI models with ₹0 API cost and high data privacy protection.',
        earningPotential: '₹12,000 – ₹50,000 / project',
        customerType: 'Lawyers, Accountants, & Local Clinics',
        workflow: ['Ollama Local Execution (Llama 3 / Mistral)', 'Open WebUI Document Reader', 'Local Vector Indexing (Zero External Data Transfer)'],
        requiredTools: ['Ollama', 'Open WebUI', 'Python'],
        actionPlan: [
          { dayOrPhase: 'Day 1: Installation', title: 'Install Local Model Stack', description: 'Configure Ollama with quantized local weights on client hardware.', estimatedHours: 3, toolsNeeded: ['Ollama'] },
          { dayOrPhase: 'Day 2: Document Indexing', title: 'Setup PDF Search Pipeline', description: 'Configure local vector store to index PDF contracts and files.', estimatedHours: 3, toolsNeeded: ['Ollama', 'Python'] },
          { dayOrPhase: 'Day 3: Staff Training', title: 'Train Client Team', description: 'Provide a 1-hour walkthrough on querying private documents securely.', estimatedHours: 2, toolsNeeded: ['Open WebUI'] }
        ],
        startupCost: 0,
        difficulty: 'Medium' as const,
        timeToDemo: '1-2 days',
        risks: ['Requires client hardware with adequate RAM/GPU for local inference.'],
        isPaidAPI: false,
        isHeavyCoding: false,
        toolIds: ['ollama-local', 'python-free'],
        discoveryMatchKey: 'model'
      }
    ];

    // Combine discoveries from DB with templates to build real database-backed opportunity records
    const records: OpportunityRecord[] = [];

    for (let i = 0; i < opportunityTemplates.length; i++) {
      const tmpl = opportunityTemplates[i];
      
      // Match with relevant discoveries in DB
      const matchingDisc = discoveries.filter((d: any) => 
        d.title?.toLowerCase().includes(tmpl.discoveryMatchKey) || 
        d.description?.toLowerCase().includes(tmpl.discoveryMatchKey) ||
        d.category?.toLowerCase().includes(tmpl.discoveryMatchKey)
      );
      const discIds = matchingDisc.slice(0, 3).map((d: any) => d.id);
      if (discIds.length === 0 && discoveries.length > 0) {
        discIds.push(discoveries[i % discoveries.length].id);
      }

      const scoreResult = this.calculate8FactorScore(tmpl, userData);

      const record: OpportunityRecord = {
        id: tmpl.id,
        discoveryId: discIds[0] || undefined,
        discoveryIds: discIds,
        toolIds: tmpl.toolIds,
        title: tmpl.title,
        summary: tmpl.summary,
        whyMatch: tmpl.whyMatch,
        earningPotential: tmpl.earningPotential,
        customerType: tmpl.customerType,
        workflow: tmpl.workflow,
        requiredTools: tmpl.requiredTools,
        actionPlan: tmpl.actionPlan,
        startupCost: tmpl.startupCost,
        difficulty: tmpl.difficulty,
        timeToDemo: tmpl.timeToDemo,
        risks: tmpl.risks,
        score: scoreResult.totalScore,
        scoreBreakdown: scoreResult.breakdown,
        confidence: 'High',
        saved: false,
        status: 'new',
        createdAt: new Date().toISOString(),
        isDemoData: false
      };

      records.push(record);
    }

    // Dynamic generation from newly stored real discoveries in database
    for (const disc of discoveries.slice(0, 10)) {
      if (records.some(r => r.discoveryId === disc.id)) continue;

      const isModel = disc.type === 'ai_model' || disc.category?.includes('Model');
      const isAuto = disc.type === 'automation_tool' || disc.title?.toLowerCase().includes('agent');
      
      const title = isModel ? `Custom Domain Service using ${disc.title}` :
                    isAuto ? `Automated ${disc.title} Integration for Clients` :
                    `AI Solution Package built with ${disc.title}`;

      const summary = `Leverage ${disc.title} (${disc.license || 'Open Source'}) combined with free AI tools to deliver specialized solutions for local client needs.`;

      const reqTools = ['Gemini', disc.title, 'Canva'];
      const scoreResult = this.calculate8FactorScore({
        title,
        summary,
        requiredTools: reqTools,
        startupCost: 0,
        difficulty: 'Medium',
        timeToDemo: '1-2 days'
      }, userData);

      const record: OpportunityRecord = {
        id: `opp-disc-${disc.id}`,
        discoveryId: disc.id,
        discoveryIds: [disc.id],
        toolIds: ['gemini-free', 'canva-free'],
        title,
        summary,
        whyMatch: `Discovered on ${disc.source} (${disc.pricing_status || 'free'}). Matches your profile's budget limit (₹0) and learning flexibility.`,
        earningPotential: '₹4,000 – ₹20,000 / project',
        customerType: 'Niche Freelance Clients & Small Businesses',
        workflow: [`Extract ${disc.title} capabilities`, 'Integrate with Gemini for content/logic', 'Deliver finished service to client'],
        requiredTools: reqTools,
        actionPlan: [
          { dayOrPhase: 'Day 1: Setup', title: `Test ${disc.title}`, description: `Explore documentation and verify ${disc.title} local or free API execution.`, estimatedHours: 2, toolsNeeded: [disc.title] },
          { dayOrPhase: 'Day 2: Prototype', title: 'Build Demo', description: 'Create a 1-page functional demo showing the tool in action.', estimatedHours: 3, toolsNeeded: reqTools }
        ],
        startupCost: 0,
        difficulty: 'Medium',
        timeToDemo: '1-2 days',
        risks: ['Requires testing raw tool capabilities before pitching.'],
        score: scoreResult.totalScore,
        scoreBreakdown: scoreResult.breakdown,
        confidence: 'High',
        saved: false,
        status: 'new',
        createdAt: new Date().toISOString(),
        isDemoData: false
      };

      records.push(record);
    }

    // Persist records into SQLite
    for (const rec of records) {
      await this.saveOpportunityToDb(rec);
    }

    // Return records sorted by score descending
    return records.sort((a, b) => b.score - a.score);
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
          customer_type = ?,
          target_customer = ?,
          workflow = ?,
          required_tools = ?,
          action_plan = ?,
          startup_cost = ?,
          difficulty = ?,
          time_to_demo = ?,
          risks = ?,
          score = ?,
          score_breakdown = ?,
          discovery_ids = ?,
          tool_ids = ?,
          saved = ?
        WHERE id = ?
      `, [
        rec.title,
        rec.summary,
        rec.whyMatch,
        rec.earningPotential,
        rec.customerType,
        rec.customerType,
        JSON.stringify(rec.workflow),
        JSON.stringify(rec.requiredTools),
        JSON.stringify(rec.actionPlan),
        rec.startupCost,
        rec.difficulty,
        rec.timeToDemo,
        JSON.stringify(rec.risks),
        rec.score,
        JSON.stringify(rec.scoreBreakdown),
        JSON.stringify(rec.discoveryIds),
        JSON.stringify(rec.toolIds),
        isSaved,
        rec.id
      ]);
    } else {
      await dbRun(`
        INSERT INTO opportunities (
          id, discovery_id, discovery_ids, tool_ids, title, summary, why_match,
          earning_potential, customer_type, target_customer, workflow, required_tools,
          action_plan, startup_cost, difficulty, time_to_demo, risks, score,
          score_breakdown, confidence, saved, status, is_demo_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        rec.id,
        rec.discoveryId || null,
        JSON.stringify(rec.discoveryIds),
        JSON.stringify(rec.toolIds),
        rec.title,
        rec.summary,
        rec.whyMatch,
        rec.earningPotential,
        rec.customerType,
        rec.customerType,
        JSON.stringify(rec.workflow),
        JSON.stringify(rec.requiredTools),
        JSON.stringify(rec.actionPlan),
        rec.startupCost,
        rec.difficulty,
        rec.timeToDemo,
        JSON.stringify(rec.risks),
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
    if (rows.length === 0) {
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
    return {
      id: row.id,
      discoveryId: row.discovery_id,
      discoveryIds: this.safeParseJSON(row.discovery_ids, row.discovery_id ? [row.discovery_id] : []),
      toolIds: this.safeParseJSON(row.tool_ids, []),
      title: row.title,
      summary: row.summary || row.problem || '',
      whyMatch: row.why_match || row.solution || '',
      earningPotential: row.earning_potential || row.potential_monetization || '₹5,000–₹25,000/month',
      customerType: row.customer_type || row.target_customer || 'Local Businesses',
      workflow: this.safeParseJSON(row.workflow, []),
      requiredTools: this.safeParseJSON(row.required_tools, []),
      actionPlan: this.safeParseJSON(row.action_plan, []),
      startupCost: Number(row.startup_cost || 0),
      difficulty: (row.difficulty as any) || 'Medium',
      timeToDemo: row.time_to_demo || '1-2 days',
      risks: this.safeParseJSON(row.risks, []),
      score: Number(row.score || 0),
      scoreBreakdown: this.safeParseJSON(row.score_breakdown, {
        skillMatch: 20, marketDemand: 16, toolMatch: 12, startupCost: 15, timeToDemo: 8, learningCurve: 4, competition: 4, simplicity: 4
      }),
      confidence: row.confidence || 'High',
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
