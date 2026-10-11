/**
 * Opportunity OS — Practical Guidance Synthesis Engine
 * 
 * Generates task-specific, practical, beginner-friendly execution instructions
 * grounded in the actual opportunity, its deliverable, available tools,
 * prerequisites, budget, and the current action step.
 * 
 * Strictly follows the 12 key guidance dimensions:
 * 1. Step objective
 * 2. Starting point / Prerequisites
 * 3. Exact actions (sequential, beginner-friendly)
 * 4. Specific tools & direct workflows
 * 5. Exact copy-ready inputs (prompts, scripts, templates)
 * 6. Concrete illustrative example (truthfully labeled as illustrative)
 * 7. Expected output
 * 8. Verification checklist
 * 9. Common problems & recovery instructions
 * 10. Time and cost breakdown (distinguishing ₹0 free tier from paid)
 * 11. Completion condition
 * 12. Next-step connection
 */

import { ActionStep } from '../types/index.js';

export interface PracticalStepGuidance {
  stepOrder: number;
  phase: string;
  title: string;
  estimatedTime: string;
  costEstimate: string;
  
  objective: string;
  startingPoint: string[];
  exactActions: string[];
  specificTools: {
    name: string;
    purpose: string;
    accessNote: string;
    actionWorkflow: string;
    url?: string;
  }[];
  exactInputs?: {
    label: string;
    type: 'prompt' | 'template' | 'script' | 'config';
    content: string;
    notes?: string;
  }[];
  concreteExample?: {
    headline: string;
    details: string;
    previewText?: string;
    isIllustrative: true;
  };
  expectedOutput: string;
  verificationChecklist: string[];
  commonProblems: {
    problem: string;
    recovery: string;
  }[];
  timeAndCost: {
    estimatedTime: string;
    financialCost: string;
    assumptions: string;
  };
  completionCondition: string;
  nextStepConnection: string;
}

export type OpportunityDomain = 
  | 'design' 
  | 'automation' 
  | 'content' 
  | 'data_leads' 
  | 'ai_assistant' 
  | 'general';

export function detectOpportunityDomain(tools: string[], title: string, outcome: string): OpportunityDomain {
  const text = `${title} ${outcome} ${tools.join(' ')}`.toLowerCase();
  
  if (text.includes('zapier') || text.includes('make') || text.includes('n8n') || text.includes('webhook') || text.includes('automation') || text.includes('pipeline')) {
    return 'automation';
  }
  if (text.includes('canva') || text.includes('design') || text.includes('banner') || text.includes('poster') || text.includes('logo') || text.includes('visual') || text.includes('reel') || text.includes('video')) {
    return 'design';
  }
  if (text.includes('lead') || text.includes('scrape') || text.includes('google maps') || text.includes('directory') || text.includes('database') || text.includes('spreadsheet') || text.includes('sheets')) {
    return 'data_leads';
  }
  if (text.includes('bot') || text.includes('assistant') || text.includes('agent') || text.includes('voiceflow') || text.includes('botpress') || text.includes('customer service') || text.includes('faq')) {
    return 'ai_assistant';
  }
  if (text.includes('writer') || text.includes('content') || text.includes('copywriting') || text.includes('blog') || text.includes('article') || text.includes('newsletter') || text.includes('script') || text.includes('post')) {
    return 'content';
  }
  
  return 'general';
}

export function synthesizePracticalGuidance(
  step: ActionStep,
  opportunityContext: {
    title?: string;
    outcome?: string;
    whatYouMake?: string;
    targetCustomer?: string;
    whoPaysForIt?: string;
    tools?: string[];
    difficulty?: string;
    startupCost?: number;
    userBudget?: number;
  }
): PracticalStepGuidance {
  const deliverable = opportunityContext.whatYouMake || opportunityContext.outcome || opportunityContext.title || 'AI Service Deliverable';
  const customer = opportunityContext.whoPaysForIt || opportunityContext.targetCustomer || 'Local small business owners';
  const tools = opportunityContext.tools && opportunityContext.tools.length > 0 ? opportunityContext.tools : ['ChatGPT', 'Canva'];
  const primaryTool = tools[0] || 'ChatGPT';
  const secondaryTool = tools[1] || 'Canva';
  const domain = detectOpportunityDomain(tools, opportunityContext.title || '', deliverable);
  const isZeroCost = (opportunityContext.startupCost ?? 0) <= 0 || (opportunityContext.userBudget ?? 0) === 0;
  const costLabel = isZeroCost ? '₹0 (Free tier only — zero upfront spend)' : `₹${opportunityContext.startupCost || 0} initial investment`;

  const stepOrder = step.step_order || 1;
  const phase = step.phase || 'LEARN';

  switch (phase) {
    case 'LEARN': {
      return {
        stepOrder,
        phase: '1. LEARN',
        title: step.title || `Set Up ${primaryTool} & Verify Your Free Workspace`,
        estimatedTime: step.estimated_time || '45m',
        costEstimate: costLabel,
        objective: `Prepare your free accounts in ${tools.join(' and ')}, verify that you can create files without paying, and configure your initial workspace for ${deliverable}.`,
        startingPoint: [
          `A standard desktop or laptop web browser with internet access.`,
          `Zero prior technical setup required. Free tier accounts are 100% sufficient.`,
          `No paid credit card or subscription needed.`
        ],
        exactActions: [
          `Open your browser and navigate to the official website for ${primaryTool}.`,
          `Register for a free individual account using your email or Google account. Do NOT select enterprise or paid plans.`,
          tools.length > 1 ? `Open a separate browser tab for ${secondaryTool} and confirm your free login works there as well.` : `Verify you can open a new blank project document or chat window.`,
          `Test creating a single blank project or draft to verify that your account has export privileges on the free tier.`,
          `Bookmark the workspace URL in your browser bookmarks bar so you can return to it during the demo building step.`
        ],
        specificTools: [
          {
            name: primaryTool,
            purpose: `Primary generation engine for ${deliverable}.`,
            accessNote: isZeroCost ? 'Free Tier (Zero Cost)' : 'Free tier or starter trial',
            actionWorkflow: `Log in → Create New Workspace / Project → Confirm free access.`
          },
          ...(tools.length > 1 ? [{
            name: secondaryTool,
            purpose: `Packaging, formatting, or distribution of deliverables.`,
            accessNote: 'Free Tier (Zero Cost)',
            actionWorkflow: `Log in → Test basic template search or workflow canvas.`
          }] : [])
        ],
        exactInputs: [
          {
            label: `${primaryTool} Quick Verification Test`,
            type: 'prompt',
            content: `Hello! I am preparing a sample deliverable for ${customer}. Please confirm you understand and summarize 3 common pain points that ${customer} face every week.`,
            notes: `Paste this verification prompt to ensure your session is active and responsive.`
          }
        ],
        concreteExample: {
          headline: `Illustrative Workspace Setup for ${customer}`,
          details: `Example: A folder in ${primaryTool} titled "${customer} - Samples 2026" with a blank draft ready to receive content.`,
          previewText: `Project Title: Sample Kit for ${customer}\nTarget Outcome: ${deliverable}\nStatus: Workspace Ready`,
          isIllustrative: true
        },
        expectedOutput: `Active, verified free accounts on ${tools.join(' and ')} with a clean blank workspace ready for Step 2.`,
        verificationChecklist: [
          `You can log into ${primaryTool} without any billing prompts or errors.`,
          tools.length > 1 ? `You can log into ${secondaryTool} without any billing prompts.` : `You can create and save a new file.`,
          `You have confirmed you can export or share files on the free plan.`
        ],
        commonProblems: [
          {
            problem: `Tool asks for credit card or Pro upgrade during signup.`,
            recovery: `Look for the 'Skip for now', 'Continue with Free Plan', or 'Start with Free Tier' link in small text below the upgrade modal.`
          },
          {
            problem: `Cannot verify email address or activation email is delayed.`,
            recovery: `Check your Spam/Promotions folder or use 'Sign in with Google' to bypass email confirmation delay.`
          }
        ],
        timeAndCost: {
          estimatedTime: step.estimated_time || '45m',
          financialCost: '₹0 (Free tier strictly applied)',
          assumptions: 'Assumes you use standard free account tiers without adding paid third-party add-ons.'
        },
        completionCondition: `Both tools are open in browser tabs and you have successfully typed or tested a simple command in them.`,
        nextStepConnection: `In Step 2, you will use these active accounts to generate your concrete demo deliverable.`
      };
    }

    case 'BUILD': {
      let promptContent = '';
      let workflowSteps: string[] = [];

      if (domain === 'design') {
        promptContent = `Act as an expert graphic designer and copywriter. Create a complete, high-converting promotional post concept for a local ${customer}. 
Include:
1. Catchy headline (max 7 words)
2. Body copy highlighting a specific problem and solution (max 40 words)
3. Direct Call to Action (e.g. "Send a WhatsApp to book")
4. Visual design layout recommendations (color contrast, layout placement, photo style).`;

        workflowSteps = [
          `Open ${primaryTool} and paste the copy-ready prompt below.`,
          `Review the generated text. Adjust any details so they fit a realistic local ${customer}.`,
          `Open ${secondaryTool} (or design tool). Choose a standard 1080x1350px or 1080x1080px free template.`,
          `Paste the headline and copy into the template. Use clean sans-serif typography with high contrast.`,
          `Export the finished graphic as a high-resolution PNG or PDF to your local downloads folder.`
        ];
      } else if (domain === 'automation') {
        promptContent = `I am designing a simple, zero-cost automated workflow for ${customer}. 
The goal is: ${deliverable}.
Provide a clean step-by-step trigger and action setup:
1. Trigger event (e.g., new form response or message received)
2. Processing step (e.g., format with AI or parse text)
3. Action step (e.g., create Google Sheets row or send WhatsApp notification)
4. Fallback test instructions to verify it works without paying for third-party connectors.`;

        workflowSteps = [
          `Open ${primaryTool} and inspect the workflow logic generated by the prompt.`,
          `Open your automation canvas (${secondaryTool || 'Make/Zapier'}). Create a new free scenario.`,
          `Configure the Trigger step using free webhooks or Google Forms.`,
          `Add the Action step to deliver the processed result to a destination sheet or email.`,
          `Run a manual test execution using sample test data to verify a green status check.`
        ];
      } else if (domain === 'data_leads') {
        promptContent = `Generate a structured research criteria template for finding 10 high-value ${customer} in a mid-sized city.
Include columns:
1. Business Name
2. Location / Area
3. Current Public Contact (Website/Phone/Instagram)
4. Obvious Gap or Missing AI Workflow (e.g., slow response time, outdated visual menu)
5. Proposed Solution tailored to them.`;

        workflowSteps = [
          `Open Google Sheets in a browser tab. Create a new sheet titled "${customer} - Sample Audit".`,
          `Copy the column headers from the template below into row 1.`,
          `Search Google Maps or local business directories for 3 real, active businesses matching ${customer}.`,
          `Fill in their public details and identify one specific area where ${deliverable} would save them time or money.`,
          `Export or format the sheet neatly so it looks presentable to share.`
        ];
      } else {
        promptContent = `Create a complete, ready-to-use sample deliverable for ${customer}.
Deliverable to produce: ${deliverable}.
Requirements:
1. Professional, beginner-friendly tone
2. Immediately useful without extra editing
3. Clearly structured with clear headings and bullet points
4. Tailored specifically to the daily challenges of ${customer}.`;

        workflowSteps = [
          `Open ${primaryTool} and paste the prompt below.`,
          `Inspect the output and customize any brackets with real details.`,
          `Copy the output into a clean Google Doc or Notion page.`,
          `Format headings, fix line breaks, and add a professional header.`,
          `Export or prepare the final draft as a shareable link or PDF.`
        ];
      }

      return {
        stepOrder,
        phase: '2. BUILD',
        title: step.title || `Create Your Concrete Demo: ${deliverable.slice(0, 45)}`,
        estimatedTime: step.estimated_time || '2h',
        costEstimate: '₹0 (Zero cost sample)',
        objective: `Produce a real, tangible sample of "${deliverable}" that you can physically show to a prospective client as proof of your ability.`,
        startingPoint: [
          `Verified tools from Step 1 open in your browser tabs.`,
          `Clear understanding of what ${customer} will receive.`,
          `A designated local folder on your computer to save the completed sample file.`
        ],
        exactActions: workflowSteps,
        specificTools: [
          {
            name: primaryTool,
            purpose: `Generate the core copy, logic, or assets.`,
            accessNote: 'Free tier',
            actionWorkflow: `Paste prompt → Refine output → Copy final draft.`
          },
          {
            name: secondaryTool,
            purpose: `Package the final deliverable into a clean, presentable format.`,
            accessNote: 'Free tier',
            actionWorkflow: `Apply clean styling → Verify visual contrast → Export file.`
          }
        ],
        exactInputs: [
          {
            label: `Copy-Ready Demo Generation Prompt for ${primaryTool}`,
            type: 'prompt',
            content: promptContent,
            notes: `Click 'Copy Prompt' below, paste into ${primaryTool}, and review the generated response.`
          }
        ],
        concreteExample: {
          headline: `Illustrative Output Sample for ${customer}`,
          details: `Example deliverable: A ready-to-share 1-page sample asset solving a common problem for ${customer}.`,
          previewText: `*Deliverable: ${deliverable}*\n*Client Profile: Local ${customer}*\n*Status: Completed & Exported to PDF (Zero Watermark)*`,
          isIllustrative: true
        },
        expectedOutput: `A downloaded file (PDF, PNG, Sheet, or live link) representing your complete, high-quality demonstration sample.`,
        verificationChecklist: [
          `The sample file opens cleanly on both mobile and desktop screens.`,
          `There are zero placeholder texts (e.g. "[Insert Name Here]") left in the visible deliverable.`,
          `The output directly addresses an everyday problem that ${customer} faces.`,
          `The file was created 100% on free tiers without watermarks or paid tool requirements.`
        ],
        commonProblems: [
          {
            problem: `The generated text or design looks generic or bland.`,
            recovery: `Add 2 specific constraints to your prompt: specify the exact niche (e.g., 'boutique fitness studio' instead of 'gym') and request practical, jargon-free phrasing.`
          },
          {
            problem: `Tool exports with a watermark.`,
            recovery: `Ensure you only selected free fonts and elements. In Canva or similar tools, replace any element showing a crown icon with a free alternative before exporting.`
          }
        ],
        timeAndCost: {
          estimatedTime: step.estimated_time || '2h',
          financialCost: '₹0',
          assumptions: 'Free tools only. One complete sample created from scratch.'
        },
        completionCondition: `You have the final exported file or public link saved and ready on your computer.`,
        nextStepConnection: `In Step 3, you will turn this sample into an accessible proof-of-work showcase.`
      };
    }

    case 'PORTFOLIO': {
      return {
        stepOrder,
        phase: '3. PORTFOLIO',
        title: step.title || `Package Your Proof-of-Work Showcase`,
        estimatedTime: step.estimated_time || '45m',
        costEstimate: '₹0 (Free hosting / cloud drive)',
        objective: `Package your demo sample into a publicly accessible, zero-cost showcase (Google Drive view-only link, Notion page, or Loom recording) so prospective buyers can inspect it without friction.`,
        startingPoint: [
          `Your completed demo file from Step 2.`,
          `A free Google Drive, Dropbox, or Notion account.`
        ],
        exactActions: [
          `Create a clean folder in Google Drive named "Demo Showcase - ${deliverable.slice(0, 30)}".`,
          `Upload your exported sample file (PNG, PDF, or document) into this folder.`,
          `Right-click the file or folder and click "Share" → change General Access to "Anyone with the link can view".`,
          `Copy the view-only link and test opening it in an incognito / private browser window to confirm it opens without asking for a password.`,
          `Optionally: If your demo is interactive or dynamic, record a 90-second free Loom video walkthrough showing how it works.`
        ],
        specificTools: [
          {
            name: 'Google Drive / Cloud Storage',
            purpose: 'Host your demo file with zero cost and reliable public access.',
            accessNote: 'Free Tier (15 GB standard storage)',
            actionWorkflow: 'Upload → Share → Set to "Anyone with link can view" → Copy link.'
          }
        ],
        exactInputs: [
          {
            label: '1-Line Portfolio Showcase Summary',
            type: 'template',
            content: `Proof of Work: ${deliverable} for ${customer}\nFormat: High-resolution deliverable sample\nLive Preview: [Paste Your Public Google Drive / Notion Link Here]`,
            notes: 'Save this snippet so you can quickly paste it into your outreach messages.'
          }
        ],
        concreteExample: {
          headline: 'Illustrative Portfolio Showcase',
          details: 'A clean Google Drive folder with 1 high-resolution PDF sample and a 1-page summary note.',
          previewText: 'Folder: Portfolio - AI Service Deliverables\nFile: Sample_1_LocalBusiness_Demo.pdf\nAccess: Anyone with link (Viewer)',
          isIllustrative: true
        },
        expectedOutput: `A verified, working public preview link that opens your demo sample immediately on any device.`,
        verificationChecklist: [
          `The link opens in an incognito window without requiring Google login.`,
          `The sample displays clearly on a mobile phone screen.`,
          `The link is saved in your notes ready for outreach.`
        ],
        commonProblems: [
          {
            problem: `Link asks for 'Request Access' or requires login.`,
            recovery: `In Google Drive, ensure General Access is toggled from 'Restricted' to 'Anyone with the link' with role set to 'Viewer'.`
          }
        ],
        timeAndCost: {
          estimatedTime: step.estimated_time || '45m',
          financialCost: '₹0',
          assumptions: 'Free Google Drive or public cloud storage.'
        },
        completionCondition: `You have successfully opened your public preview link in an incognito browser window and verified the file loads.`,
        nextStepConnection: `In Step 4, you will identify 5 exact prospective buyers who could benefit from this deliverable.`
      };
    }

    case 'PROSPECT': {
      return {
        stepOrder,
        phase: '4. PROSPECT',
        title: step.title || `Identify 5 Realistic Potential Clients (${customer})`,
        estimatedTime: step.estimated_time || '1h 15m',
        costEstimate: '₹0 (Manual public directory search)',
        objective: `Find 5 specific, active businesses matching "${customer}" who have an obvious need for "${deliverable}", without using paid scraping tools or spam lists.`,
        startingPoint: [
          `Your working portfolio link from Step 3.`,
          `Google Maps, Instagram, or LinkedIn search bar open in your browser.`,
          `A blank notepad or Google Sheet to record 5 candidate contacts.`
        ],
        exactActions: [
          `Open Google Maps or Instagram search. Search for "${customer}" in your local city or target geographic region.`,
          `Select 5 active businesses with visible, recent activity (posts in the last 30 days or active customer reviews).`,
          `Inspect each business profile: identify ONE specific detail that your demo could improve (e.g. outdated graphics, slow response times, missing FAQ, plain text announcements).`,
          `Record each business name, public website or profile link, and the name of the owner or manager if visible.`,
          `Verify that each candidate is an authentic local business, not a massive national chain where local outreach is impossible.`
        ],
        specificTools: [
          {
            name: 'Google Maps / Instagram / LinkedIn',
            purpose: 'Discover real local business owners with visible contact channels.',
            accessNote: 'Free public search',
            actionWorkflow: 'Search by category + city → Check recency of activity → Note specific operational friction.'
          }
        ],
        exactInputs: [
          {
            label: '5-Prospect Tracking Template',
            type: 'template',
            content: `1. Business: [Name] | Contact: [Instagram / Email] | Problem: [Specific gap observed]
2. Business: [Name] | Contact: [Instagram / Email] | Problem: [Specific gap observed]
3. Business: [Name] | Contact: [Instagram / Email] | Problem: [Specific gap observed]
4. Business: [Name] | Contact: [Instagram / Email] | Problem: [Specific gap observed]
5. Business: [Name] | Contact: [Instagram / Email] | Problem: [Specific gap observed]`,
            notes: 'Fill in all 5 rows before proceeding to outreach.'
          }
        ],
        concreteExample: {
          headline: 'Illustrative Prospect List for Local Market',
          details: 'Example list: 5 local yoga studios with active Instagram accounts but irregular post design.',
          previewText: '1. Urban Pulse Yoga - Contact: DM @urbanpulse - Note: Uses low-res text screenshots for schedule\n2. Balance Studio - Contact: info@balance.co - Note: Missing visual price card',
          isIllustrative: true
        },
        expectedOutput: `A documented list of 5 real prospective clients with their public contact handles and one specific observation for each.`,
        verificationChecklist: [
          `All 5 businesses are currently open and actively operating.`,
          `You have identified a genuine reason why ${deliverable} would be relevant to them.`,
          `You have recorded a valid public direct channel (Instagram DM, email, or WhatsApp business).`
        ],
        commonProblems: [
          {
            problem: `Selected businesses are too large and ignore cold inquiries.`,
            recovery: `Focus on independent, owner-operated businesses with fewer than 15 employees where the owner personally manages social media or messages.`
          }
        ],
        timeAndCost: {
          estimatedTime: step.estimated_time || '1h 15m',
          financialCost: '₹0',
          assumptions: 'Free manual research using public search engines and directories.'
        },
        completionCondition: `You have 5 real candidate names with verified contact methods written down in your tracker.`,
        nextStepConnection: `In Step 5, you will manually send tailored, friendly introduction messages to these 5 contacts.`
      };
    }

    case 'OUTREACH': {
      const toolMention = tools.slice(0, 2).join(' & ');
      const script = `Hi [Name or Business Team]! 

I came across your page and really liked your [mention specific compliment about their business, e.g. recent post or customer review].

I noticed you might be spending time on [mention observed problem, e.g. putting together promotional flyers or updating service lists]. I actually put together a free sample of what a streamlined ${deliverable} could look like for your business using ${toolMention}:

👉 Live Sample: [Insert Your Google Drive / Portfolio Link]

Zero obligation at all — I created this as a helpful example. If you find it useful, feel free to use it! Would you be open to me sharing the editable template?

Best,
[Your Name]`;

      return {
        stepOrder,
        phase: '5. OUTREACH',
        title: step.title || `Send Tailored Introduction Messages to Your 5 Prospects`,
        estimatedTime: step.estimated_time || '1 hour',
        costEstimate: '₹0 (Manual 1-to-1 messaging)',
        objective: `Send 5 respectful, personalized messages offering genuine value and your sample link. Strictly zero spam bots, zero mass email blasts, and zero dishonest sales pressure.`,
        startingPoint: [
          `Your 5 identified prospects from Step 4.`,
          `Your live portfolio link from Step 3.`,
          `The copy-ready outreach script below.`
        ],
        exactActions: [
          `Take your first prospect from Step 4.`,
          `Copy the personalized script below. Replace [Name], [Specific compliment], [Observed problem], and [Your Link] with genuine details for that specific business.`,
          `Read the customized message aloud to verify it sounds like a human neighbor, not an automated marketing bot.`,
          `Send the message manually through their preferred public channel (Instagram DM, business email, or contact form).`,
          `Repeat the same careful, individualized process for the remaining 4 prospects.`,
          `Record the exact date and time each message was sent in your tracker.`
        ],
        specificTools: [
          {
            name: 'Direct Messaging / Email Client',
            purpose: 'Send manual, individualized outreach messages.',
            accessNote: 'Free personal or business account',
            actionWorkflow: 'Customize template → Review tone → Send manually 1-by-1.'
          }
        ],
        exactInputs: [
          {
            label: 'Human-First Outreach Message Template',
            type: 'script',
            content: script,
            notes: 'Never send without customizing the bracketed fields. Personalization is what earns respectful replies.'
          }
        ],
        concreteExample: {
          headline: 'Illustrative Message Sent to a Local Business',
          details: 'Example personalized note sent to a local café owner showcasing a visual weekend special menu.',
          previewText: 'Hi Sarah! Loved your new espresso blend launch. I noticed you post weekend specials in plain text stories, so I made a free visual menu demo: [Link]. Hope it helps your weekend foot traffic!',
          isIllustrative: true
        },
        expectedOutput: `5 personalized messages successfully delivered to 5 real prospective clients.`,
        verificationChecklist: [
          `Every message contains the recipient's real business name and an honest, specific observation.`,
          `Your portfolio link was tested and works properly in the message.`,
          `Zero automated sending scripts or mass mailing tools were used.`,
          `You have logged the send timestamps in your tracker.`
        ],
        commonProblems: [
          {
            problem: `Message feels too pushy or salesy.`,
            recovery: `Remove any pitch about pricing or hiring you. Frame the message entirely as a gift: 'I made this sample for you, feel free to use it for free.' If they like it, they will ask how you made it.`
          },
          {
            problem: `Prospect has DMs closed.`,
            recovery: `Look for a public business email in their bio or use their website contact form.`
          }
        ],
        timeAndCost: {
          estimatedTime: step.estimated_time || '1 hour',
          financialCost: '₹0',
          assumptions: 'Manual outreach sent one-by-one.'
        },
        completionCondition: `All 5 individual messages have been sent and recorded in your tracker.`,
        nextStepConnection: `In Step 6, you will record your actual results in Opportunity OS to calibrate your builder progress.`
      };
    }

    case 'RESULT':
    default: {
      return {
        stepOrder,
        phase: '6. RESULT',
        title: step.title || `Log Real Outcomes in Opportunity OS Progress Screen`,
        estimatedTime: step.estimated_time || '20m',
        costEstimate: '₹0',
        objective: `Record your authentic outreach outcomes (replies received, meetings booked, or lack of response) into the Opportunity OS Progress screen. Truthful negative outcomes (e.g. no replies) are just as important as positive ones to refine your future recommendations.`,
        startingPoint: [
          `Your recorded timestamps and responses from the 5 prospects in Step 5.`,
          `Opportunity OS Progress Screen open in your application.`
        ],
        exactActions: [
          `Check your inboxes 24–48 hours after sending your outreach messages.`,
          `Count the exact number of responses received (positive, neutral, or rejections).`,
          `In Opportunity OS, navigate to the Step-by-Step Guide or Progress tracker.`,
          `Log your results honestly: record how many prospects were contacted (5), how many replied, and any qualitative feedback received.`,
          `If a prospect expressed interest, schedule a brief follow-up to deliver an additional sample or discuss recurring service.`,
          `If zero prospects replied, review your demo topic or prospect selection for your next iteration.`
        ],
        specificTools: [
          {
            name: 'Opportunity OS Progress Engine',
            purpose: 'Log honest execution metrics and calibrate future opportunity matches.',
            accessNote: 'Built-in system feature',
            actionWorkflow: 'Log prospects contacted → Log replies → Record learnings.'
          }
        ],
        exactInputs: [
          {
            label: 'Outcome Reflection Guide',
            type: 'template',
            content: `- Total contacted: 5\n- Responses received: [e.g., 1 reply / 0 replies]\n- Feedback summary: [e.g., "Liked the sample but already have a designer" or "Asked about price"]\n- Key lesson learned: [e.g., "Need to message earlier in the week"]`,
            notes: 'Use this reflection to document what happened truthfully.'
          }
        ],
        concreteExample: {
          headline: 'Illustrative Progress Log Entry',
          details: 'Example log: 5 gyms contacted, 1 replied asking for pricing, 4 did not respond after 48h.',
          previewText: 'Prospects Contacted: 5 | Responses: 1 | Outcome: First conversation initiated | Next Action: Send pricing sheet',
          isIllustrative: true
        },
        expectedOutput: `An authentic log entry in Opportunity OS reflecting real-world market feedback on your deliverable.`,
        verificationChecklist: [
          `Actual response counts match reality (never exaggerate or invent responses).`,
          `Your progress metrics accurately reflect your time spent and actions taken.`,
          `You have a clear decision on whether to follow up, iterate the sample, or test a different opportunity.`
        ],
        commonProblems: [
          {
            problem: `Nobody replied after 24 hours.`,
            recovery: `This is normal in business outreach (typical cold response rates are 10-20%). Do not take it personally. Give it 72 hours before deciding whether to send a polite 1-sentence follow-up or test another service.`
          }
        ],
        timeAndCost: {
          estimatedTime: step.estimated_time || '20m',
          financialCost: '₹0',
          assumptions: 'Internal logging and reflection.'
        },
        completionCondition: `You have completed all 6 phases and logged your final actions in the progress dashboard.`,
        nextStepConnection: `Your Opportunity OS profile and matching engine will adapt based on the real signals recorded during this execution.`
      };
    }
  }
}
