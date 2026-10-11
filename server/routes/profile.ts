import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import { requireAuth } from '../middleware/auth.js';

export const profileRouter = Router();

// Protect all profile routes with requireAuth
profileRouter.use(requireAuth);

/**
 * Helper to retrieve or lazily initialize the profile for the authenticated user
 */
async function getOrCreateUserProfile(userId: string) {
  let profile = await dbGet<any>('SELECT * FROM profiles WHERE user_id = ?;', [userId]);
  if (!profile) {
    const profileId = `profile_${userId}`;
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO profiles (id, user_id, name, title, bio, preferred_budget, available_hours_per_week, preferred_work_type, disliked_work, remote_preference, learning_tolerance, created_at, updated_at)
       VALUES (?, ?, 'Creator Profile', 'Independent Creator', '', 0, 20, 'Freelance', '', 'Remote Only', 'High', ?, ?);`,
      [profileId, userId, now, now]
    );
    profile = await dbGet<any>('SELECT * FROM profiles WHERE id = ?;', [profileId]);
  }
  return profile;
}

// GET complete user profile including all sub-entities
profileRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await getOrCreateUserProfile(userId);

    const skills = await dbAll('SELECT * FROM skills WHERE profile_id = ?;', [profile.id]);
    const toolsRaw = await dbAll('SELECT * FROM tools WHERE profile_id = ?;', [profile.id]);
    const goals = await dbAll('SELECT * FROM goals WHERE profile_id = ?;', [profile.id]);
    const interests = await dbAll('SELECT * FROM interests WHERE profile_id = ?;', [profile.id]);
    const projectsRaw = await dbAll('SELECT * FROM projects WHERE profile_id = ?;', [profile.id]);

    const tools = toolsRaw.map(t => ({
      ...t,
      capabilities: typeof t.capabilities === 'string' ? JSON.parse(t.capabilities || '[]') : t.capabilities
    }));

    const projects = projectsRaw.map(p => ({
      ...p,
      technologies: typeof p.technologies === 'string' ? JSON.parse(p.technologies || '[]') : p.technologies
    }));

    res.json({
      profile,
      skills,
      tools,
      goals,
      interests,
      projects
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT update core profile fields
profileRouter.put('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, title, bio, preferred_budget, available_hours_per_week, preferred_work_type, disliked_work, remote_preference, learning_tolerance } = req.body;
    const profile = await getOrCreateUserProfile(userId);

    await dbRun(
      `UPDATE profiles SET
        name = COALESCE(?, name),
        title = COALESCE(?, title),
        bio = COALESCE(?, bio),
        preferred_budget = COALESCE(?, preferred_budget),
        available_hours_per_week = COALESCE(?, available_hours_per_week),
        preferred_work_type = COALESCE(?, preferred_work_type),
        disliked_work = COALESCE(?, disliked_work),
        remote_preference = COALESCE(?, remote_preference),
        learning_tolerance = COALESCE(?, learning_tolerance),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?;`,
      [name, title, bio, preferred_budget, available_hours_per_week, preferred_work_type, disliked_work, remote_preference, learning_tolerance, profile.id, userId]
    );

    const updated = await dbGet('SELECT * FROM profiles WHERE id = ?;', [profile.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// SKILLS API
profileRouter.post('/skills', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, proficiency, confidence, experience_years, last_used } = req.body;
    const profile = await getOrCreateUserProfile(userId);

    const id = `skill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await dbRun(
      `INSERT INTO skills (id, user_id, profile_id, name, proficiency, confidence, experience_years, last_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, userId, profile.id, name, proficiency || 'Intermediate', confidence || 80, experience_years || 1, last_used || 'Recently']
    );

    const created = await dbGet('SELECT * FROM skills WHERE id = ?;', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

profileRouter.put('/skills/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const profile = await getOrCreateUserProfile(userId);
    const { name, proficiency, confidence, experience_years, last_used } = req.body;

    const existing = await dbGet('SELECT id FROM skills WHERE id = ? AND profile_id = ?;', [id, profile.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Skill not found or not owned by authenticated user' });
    }

    await dbRun(
      `UPDATE skills SET
        name = COALESCE(?, name),
        proficiency = COALESCE(?, proficiency),
        confidence = COALESCE(?, confidence),
        experience_years = COALESCE(?, experience_years),
        last_used = COALESCE(?, last_used)
       WHERE id = ? AND profile_id = ?;`,
      [name, proficiency, confidence, experience_years, last_used, id, profile.id]
    );
    const updated = await dbGet('SELECT * FROM skills WHERE id = ?;', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

profileRouter.delete('/skills/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const profile = await getOrCreateUserProfile(userId);

    const result = await dbRun('DELETE FROM skills WHERE id = ? AND profile_id = ?;', [id, profile.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Skill not found or not owned by user' });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// TOOLS API
profileRouter.post('/tools', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, category, access_type, cost_per_month, capabilities, familiarity } = req.body;
    const profile = await getOrCreateUserProfile(userId);

    const id = `tool_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const capabilitiesJson = JSON.stringify(Array.isArray(capabilities) ? capabilities : []);

    await dbRun(
      `INSERT INTO tools (id, user_id, profile_id, name, category, access_type, cost_per_month, capabilities, familiarity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, userId, profile.id, name, category || 'General', access_type || 'Free', cost_per_month || 0, capabilitiesJson, familiarity || 80]
    );

    const created = await dbGet('SELECT * FROM tools WHERE id = ?;', [id]);
    res.status(201).json({
      ...created,
      capabilities: JSON.parse(created.capabilities || '[]')
    });
  } catch (error) {
    console.error('Error adding tool:', error);
    res.status(500).json({ error: 'Failed to add tool' });
  }
});

profileRouter.put('/tools/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const profile = await getOrCreateUserProfile(userId);
    const { name, category, access_type, cost_per_month, capabilities, familiarity } = req.body;
    const capabilitiesJson = capabilities !== undefined ? JSON.stringify(Array.isArray(capabilities) ? capabilities : []) : undefined;

    const existing = await dbGet('SELECT id FROM tools WHERE id = ? AND profile_id = ?;', [id, profile.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Tool not found or not owned by authenticated user' });
    }

    await dbRun(
      `UPDATE tools SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        access_type = COALESCE(?, access_type),
        cost_per_month = COALESCE(?, cost_per_month),
        capabilities = COALESCE(?, capabilities),
        familiarity = COALESCE(?, familiarity)
       WHERE id = ? AND profile_id = ?;`,
      [name, category, access_type, cost_per_month, capabilitiesJson, familiarity, id, profile.id]
    );

    const updated = await dbGet('SELECT * FROM tools WHERE id = ?;', [id]);
    res.json({
      ...updated,
      capabilities: JSON.parse(updated.capabilities || '[]')
    });
  } catch (error) {
    console.error('Error updating tool:', error);
    res.status(500).json({ error: 'Failed to update tool' });
  }
});

profileRouter.delete('/tools/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const profile = await getOrCreateUserProfile(userId);

    const result = await dbRun('DELETE FROM tools WHERE id = ? AND profile_id = ?;', [id, profile.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tool not found or not owned by user' });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting tool:', error);
    res.status(500).json({ error: 'Failed to delete tool' });
  }
});

// GOALS API
profileRouter.post('/goals', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { goal, priority, description, target_timeframe } = req.body;
    const profile = await getOrCreateUserProfile(userId);

    const id = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await dbRun(
      `INSERT INTO goals (id, user_id, profile_id, goal, priority, description, target_timeframe)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, userId, profile.id, goal, priority || 'Medium', description || '', target_timeframe || '1 month']
    );

    const created = await dbGet('SELECT * FROM goals WHERE id = ?;', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding goal:', error);
    res.status(500).json({ error: 'Failed to add goal' });
  }
});

profileRouter.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const profile = await getOrCreateUserProfile(userId);

    const result = await dbRun('DELETE FROM goals WHERE id = ? AND profile_id = ?;', [id, profile.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Goal not found or not owned by user' });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// INTERESTS API
profileRouter.post('/interests', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { category, topic, industry } = req.body;
    const profile = await getOrCreateUserProfile(userId);

    const id = `interest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await dbRun(
      `INSERT INTO interests (id, user_id, profile_id, category, topic, industry)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, userId, profile.id, category || 'General', topic, industry || 'Tech']
    );

    const created = await dbGet('SELECT * FROM interests WHERE id = ?;', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding interest:', error);
    res.status(500).json({ error: 'Failed to add interest' });
  }
});

profileRouter.delete('/interests/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const profile = await getOrCreateUserProfile(userId);

    const result = await dbRun('DELETE FROM interests WHERE id = ? AND profile_id = ?;', [id, profile.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Interest not found or not owned by user' });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting interest:', error);
    res.status(500).json({ error: 'Failed to delete interest' });
  }
});

// PROJECTS API
profileRouter.post('/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, description, technologies, status, relevance } = req.body;
    const profile = await getOrCreateUserProfile(userId);

    const id = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const techJson = JSON.stringify(Array.isArray(technologies) ? technologies : []);
    await dbRun(
      `INSERT INTO projects (id, user_id, profile_id, name, description, technologies, status, relevance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, userId, profile.id, name, description || '', techJson, status || 'In Progress', relevance || 'Medium']
    );

    const created = await dbGet('SELECT * FROM projects WHERE id = ?;', [id]);
    res.status(201).json({
      ...created,
      technologies: JSON.parse(created.technologies || '[]')
    });
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

profileRouter.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const profile = await getOrCreateUserProfile(userId);

    const result = await dbRun('DELETE FROM projects WHERE id = ? AND profile_id = ?;', [id, profile.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found or not owned by user' });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
