import { getUserProfileContext } from '../server/services/discovery/relevanceGate.js';
import { discoveryEngine } from '../server/services/discovery/discoveryEngine.js';

async function testLiveEngine() {
  console.log('--- Testing Live Personalization Engine against SQLite DB ---');
  const profile = await getUserProfileContext();
  console.log('Profile Loaded:', {
    name: profile.name,
    budget: profile.preferredBudget,
    skills: profile.skills.map(s => s.name),
    tools: profile.tools.map(t => t.name),
    goals: profile.goals.map(g => g.goal),
    interests: profile.interests.map(i => i.topic || i.category),
    projects: profile.projects.map(p => p.name)
  });

  const discoveries = await discoveryEngine.getDiscoveries({}, profile);
  console.log(`Eligible Personalized Recommendations Count: ${discoveries.length}`);

  discoveries.forEach((d, idx) => {
    console.log(`\n[#${idx + 1}] ${d.title} (Score: ${d.relevanceScore})`);
    console.log(`  - Why Matches You: ${d.whyItMatchesYou}`);
    console.log(`  - What It Helps Do: ${d.whatItHelpsYouDo}`);
    console.log(`  - Why Useful Now: ${d.whyItIsUsefulNow}`);
    console.log(`  - Cost: ${d.costExplanation}`);
  });
}

testLiveEngine().catch(console.error);
