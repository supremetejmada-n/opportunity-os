// Prompt Template Infrastructure for AI Tasks

export interface PromptTemplateInput {
  taskType: string;
  systemInstructions: string;
  userContext?: Record<string, any>;
  taskDetails: string;
  jsonSchemaFormat?: string;
}

export function buildFormattedPrompt(input: PromptTemplateInput): string {
  const parts: string[] = [];

  parts.push(`=== SYSTEM INSTRUCTIONS ===`);
  parts.push(input.systemInstructions);

  if (input.userContext && Object.keys(input.userContext).length > 0) {
    parts.push(`\n=== USER CONTEXT ===`);
    parts.push(JSON.stringify(input.userContext, null, 2));
  }

  parts.push(`\n=== TASK ===`);
  parts.push(input.taskDetails);

  if (input.jsonSchemaFormat) {
    parts.push(`\n=== OUTPUT FORMAT ===`);
    parts.push(`Respond strictly with valid JSON conforming to the following schema structure:`);
    parts.push(input.jsonSchemaFormat);
    parts.push(`Do NOT include introductory prose or markdown text outside the JSON object.`);
  }

  return parts.join('\n');
}

export const PROMPT_TEMPLATES = {
  /**
   * Generic Summarizer Template
   */
  summarize: (text: string, context?: Record<string, any>) => buildFormattedPrompt({
    taskType: 'summarize',
    systemInstructions: 'You are a precise technical analyst. Synthesize information objectively without fluff or hype.',
    userContext: context,
    taskDetails: `Summarize the following input in 2-3 clear, actionable sentences:\n${text}`
  }),

  /**
   * Discovery Classification Template (for Phase 3)
   */
  discoveryClassification: (rawItem: Record<string, any>) => buildFormattedPrompt({
    taskType: 'classify',
    systemInstructions: 'Classify technological discoveries objectively into core categories and verify open-source/free availability status.',
    userContext: rawItem,
    taskDetails: 'Analyze the provided discovery object and categorize its technical type, licensing, and pricing model.',
    jsonSchemaFormat: `{
  "category": "AI Model | Developer API | Open Source Repo | Automation Tool",
  "pricingStatus": "genuinely_free | free_tier | free_trial | open_source_paid_hosting | paid_only",
  "isOpenSource": true/false,
  "canRunLocally": true/false,
  "confidenceScore": 0.0-1.0
}`
  }),

  /**
   * Capability Analysis Template (for Phase 4)
   */
  capabilityAnalysis: (discovery: Record<string, any>, userProfile: Record<string, any>) => buildFormattedPrompt({
    taskType: 'analyze',
    systemInstructions: 'Compare technology capabilities against user skills and tools to identify potential service workflows.',
    userContext: { discovery, userProfile },
    taskDetails: 'Determine what services can be delivered using this technology given the user profile.',
    jsonSchemaFormat: `{
  "feasibleService": "Service Title",
  "requiredTools": ["Tool 1", "Tool 2"],
  "missingSkills": ["Skill gap"],
  "estimatedDemoDays": "1-2 days"
}`
  }),

  /**
   * Action Plan Generation Template (for Phase 6)
   */
  actionPlanGeneration: (opportunityTitle: string, userProfile: Record<string, any>) => buildFormattedPrompt({
    taskType: 'generate',
    systemInstructions: 'Create a structured execution roadmap spanning learning, prototype building, portfolio creation, and prospecting.',
    userContext: { opportunityTitle, userProfile },
    taskDetails: `Generate a step-by-step action plan for launching: ${opportunityTitle}`,
    jsonSchemaFormat: `{
  "objective": "Goal description",
  "steps": [
    { "phase": "Day 1: Learn", "task": "Task detail", "estimatedHours": 3 }
  ]
}`
  })
};
