import { dbGet, dbRun } from './sqlite.js';

export async function seedInitialDataIfNeeded(): Promise<void> {
  const existingProfile = await dbGet('SELECT id FROM profiles LIMIT 1;');
  if (existingProfile) {
    console.log('[Seed] User profile already exists. Skipping seed initialization.');
    return;
  }

  console.log('[Seed] Populating initial user profile, skills, tools, and goals...');

  const profileId = 'user_default';
  
  // Create primary profile (generic default user profile)
  await dbRun(
    `INSERT INTO profiles (id, name, title, bio, preferred_budget, available_hours_per_week, preferred_work_type, disliked_work, remote_preference, learning_tolerance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profileId,
      'Your Profile',
      'AI & Technology Builder',
      'Evaluating lean AI workflows, free-tier tools, and personal execution capabilities.',
      0, // ₹0 startup cost preference
      20,
      'Freelance',
      'Cold calling, manual data entry',
      'Remote Only',
      'High'
    ]
  );

  // Initial Skills
  const skills = [
    { name: 'Prompt Engineering', proficiency: 'Advanced', confidence: 90, experience: 2, last_used: 'Today' },
    { name: 'Video Editing & Clipping', proficiency: 'Intermediate', confidence: 80, experience: 1.5, last_used: 'Yesterday' },
    { name: 'TypeScript / Web Dev', proficiency: 'Advanced', confidence: 85, experience: 3, last_used: 'Today' },
    { name: 'Workflow Automation (n8n/Make)', proficiency: 'Intermediate', confidence: 75, experience: 1, last_used: 'This week' }
  ];

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i];
    await dbRun(
      `INSERT INTO skills (id, profile_id, name, proficiency, confidence, experience_years, last_used)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`skill_${i + 1}`, profileId, s.name, s.proficiency, s.confidence, s.experience, s.last_used]
    );
  }

  // Initial Tools
  const tools = [
    { name: 'Gemini 1.5 / 2.0 API', category: 'AI Model', access_type: 'Free Tier', cost: 0, capabilities: JSON.stringify(['Text Summarization', 'Multimodal Audio/Video Analysis', 'Structured Output']), familiarity: 90 },
    { name: 'Canva', category: 'Design', access_type: 'Free Tier', cost: 0, capabilities: JSON.stringify(['Graphic Design', 'Social Media Templates', 'Short-form Video']), familiarity: 85 },
    { name: 'CapCut', category: 'Video Editing', access_type: 'Free', cost: 0, capabilities: JSON.stringify(['Auto Captions', 'AI Clipping', 'Background Removal']), familiarity: 80 },
    { name: 'n8n Community Edition', category: 'Automation', access_type: 'Self-Hosted', cost: 0, capabilities: JSON.stringify(['Webhook Automation', 'Database Sync', 'API Integration']), familiarity: 75 },
    { name: 'Google Sheets', category: 'Database & Operations', access_type: 'Free', cost: 0, capabilities: JSON.stringify(['Data Storage', 'CRM Tracking', 'Form Collections']), familiarity: 95 }
  ];

  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    await dbRun(
      `INSERT INTO tools (id, profile_id, name, category, access_type, cost_per_month, capabilities, familiarity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`tool_${i + 1}`, profileId, t.name, t.category, t.access_type, t.cost, t.capabilities, t.familiarity]
    );
  }

  // Initial Goals
  const goals = [
    { goal: 'Launch ₹0-Cost AI Service', priority: 'High', description: 'Package AI clipping and transcript workflow for podcasts & content creators.', timeframe: '1 month' },
    { goal: 'Build Automated Prospecting Funnel', priority: 'Medium', description: 'Set up n8n and Google Sheets to find potential client opportunities.', timeframe: '3 months' }
  ];

  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    await dbRun(
      `INSERT INTO goals (id, profile_id, goal, priority, description, target_timeframe)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`goal_${i + 1}`, profileId, g.goal, g.priority, g.description, g.timeframe]
    );
  }

  // Initial Interests
  const interests = [
    { category: 'AI Tools', topic: 'Open Source LLMs & Audio Models', industry: 'Software & Creator Economy' },
    { category: 'Media', topic: 'Short-Form Video & Podcasting', industry: 'Digital Marketing' }
  ];

  for (let i = 0; i < interests.length; i++) {
    const inst = interests[i];
    await dbRun(
      `INSERT INTO interests (id, profile_id, category, topic, industry)
       VALUES (?, ?, ?, ?, ?)`,
      [`interest_${i + 1}`, profileId, inst.category, inst.topic, inst.industry]
    );
  }

  // Initial Projects
  const projects = [
    { name: 'AI Podcast Clipping Pipeline', description: 'Testing extraction of viral shorts from long audio files.', technologies: JSON.stringify(['CapCut', 'Gemini', 'Google Sheets']), status: 'In Progress', relevance: 'High' }
  ];

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    await dbRun(
      `INSERT INTO projects (id, profile_id, name, description, technologies, status, relevance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`project_${i + 1}`, profileId, p.name, p.description, p.technologies, p.status, p.relevance]
    );
  }

  console.log('[Seed] Database successfully populated with clean user profile data.');
}
