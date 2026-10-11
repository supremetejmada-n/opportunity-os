import { dbGet, dbRun } from './sqlite.js';

export async function seedInitialDataIfNeeded(): Promise<void> {
  const existingProfile = await dbGet('SELECT id FROM profiles LIMIT 1;');
  if (existingProfile) {
    console.log('[Seed] User profile already exists. Skipping seed initialization.');
    return;
  }

  console.log('[Seed] Initializing clean user profile with zero synthetic activity...');

  const profileId = 'user_default';
  
  // Create primary profile with clean user state
  await dbRun(
    `INSERT INTO profiles (id, name, title, bio, preferred_budget, available_hours_per_week, preferred_work_type, disliked_work, remote_preference, learning_tolerance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profileId,
      'Builder',
      '',
      '',
      0, // ₹0 startup cost preference
      10,
      'Freelance',
      '',
      'Remote Only',
      'High'
    ]
  );

  console.log('[Seed] Database successfully initialized with clean user profile (0 fake skills, 0 fake tools, 0 fake plans).');
}
