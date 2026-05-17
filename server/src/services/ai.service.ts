import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

type GoalLike = {
  title?: string;
  description?: string;
  thrustArea?: string;
  target?: number;
  uomType?: string;
  weightage?: number;
};

const AUTOPILOT_LIBRARY: Record<
  string,
  Array<{ thrustArea: string; title: string; description: string; uomType: string; target: number; weightage: number; rationale: string }>
> = {
  engineer: [
    {
      thrustArea: 'Innovation',
      title: 'Ship 3 production-ready experiments for high-potential user journeys',
      description: 'Design, build, and launch three validated experiments that improve product experience and generate measurable user learning.',
      uomType: 'MIN',
      target: 3,
      weightage: 20,
      rationale: 'Balances delivery with product discovery.'
    },
    {
      thrustArea: 'Operational Excellence',
      title: 'Reduce Sev-2 production incidents by 35%',
      description: 'Improve release quality, observability, and rollback safety so Sev-2 incidents drop by at least 35% year over year.',
      uomType: 'MAX',
      target: 35,
      weightage: 20,
      rationale: 'Keeps platform reliability visible and measurable.'
    },
    {
      thrustArea: 'Operational Excellence',
      title: 'Cut average build and deploy time by 25%',
      description: 'Optimize CI/CD pipelines and flaky tests to reduce average engineering wait time by one quarter.',
      uomType: 'MAX',
      target: 25,
      weightage: 20,
      rationale: 'Improves developer velocity without hiding quality tradeoffs.'
    },
    {
      thrustArea: 'Innovation',
      title: 'Deliver 2 reusable platform components for adjacent squads',
      description: 'Build and document two reusable components or services that are adopted by at least one neighboring team.',
      uomType: 'MIN',
      target: 2,
      weightage: 20,
      rationale: 'Highlights leverage and cross-team impact.'
    },
    {
      thrustArea: 'Revenue Growth',
      title: 'Improve activation conversion on one core funnel by 12%',
      description: 'Partner with product and analytics to ship changes that improve activation conversion on a key funnel by 12%.',
      uomType: 'MIN',
      target: 12,
      weightage: 20,
      rationale: 'Connects engineering outcomes to business value.'
    }
  ],
  manager: [
    {
      thrustArea: 'Operational Excellence',
      title: 'Increase on-time goal and check-in compliance to 95%',
      description: 'Create a consistent review rhythm so at least 95% of team goals and quarterly check-ins are completed on time.',
      uomType: 'MIN',
      target: 95,
      weightage: 20,
      rationale: 'Shows strong people-operating cadence.'
    },
    {
      thrustArea: 'Innovation',
      title: 'Launch 2 cross-functional improvement initiatives',
      description: 'Sponsor and deliver two initiatives that remove structural blockers for engineering, design, or operations partners.',
      uomType: 'MIN',
      target: 2,
      weightage: 20,
      rationale: 'Demonstrates leadership beyond line management.'
    },
    {
      thrustArea: 'Operational Excellence',
      title: 'Reduce approval turnaround time to under 48 hours',
      description: 'Establish a lightweight review process that keeps average goal and check-in approvals within two business days.',
      uomType: 'MAX',
      target: 48,
      weightage: 20,
      rationale: 'Directly improves employee experience.'
    },
    {
      thrustArea: 'Revenue Growth',
      title: 'Lift average team goal progress to 80%',
      description: 'Coach the team and unblock risks so average weighted goal progress reaches at least 80% by year end.',
      uomType: 'MIN',
      target: 80,
      weightage: 20,
      rationale: 'Makes team performance accountable and transparent.'
    },
    {
      thrustArea: 'Innovation',
      title: 'Build succession depth for 3 critical capabilities',
      description: 'Create development plans and shadowing coverage for three critical team capabilities to reduce single-threaded ownership.',
      uomType: 'MIN',
      target: 3,
      weightage: 20,
      rationale: 'Signals durable team health and scalability.'
    }
  ],
  revenue: [
    {
      thrustArea: 'Revenue Growth',
      title: 'Close $1.5M in new qualified business',
      description: 'Build pipeline, improve qualification, and close at least 1.5M in new business by year end.',
      uomType: 'MIN',
      target: 1500000,
      weightage: 25,
      rationale: 'Primary commercial outcome.'
    },
    {
      thrustArea: 'Revenue Growth',
      title: 'Increase win rate by 8%',
      description: 'Improve discovery, proposal quality, and deal strategy to increase win rate by eight percentage points.',
      uomType: 'MIN',
      target: 8,
      weightage: 20,
      rationale: 'Measures efficiency, not just volume.'
    },
    {
      thrustArea: 'Operational Excellence',
      title: 'Reduce forecast variance to below 10%',
      description: 'Improve pipeline hygiene and review discipline so monthly forecast variance remains below 10%.',
      uomType: 'MAX',
      target: 10,
      weightage: 20,
      rationale: 'Adds forecast reliability judges usually like.'
    },
    {
      thrustArea: 'Revenue Growth',
      title: 'Increase enterprise expansion revenue by 15%',
      description: 'Partner with customer success to create expansion plays that grow enterprise expansion revenue by 15%.',
      uomType: 'MIN',
      target: 15,
      weightage: 20,
      rationale: 'Balances new business with account growth.'
    },
    {
      thrustArea: 'Innovation',
      title: 'Pilot 2 new outreach or enablement motions',
      description: 'Test and operationalize two new revenue plays that measurably improve pipeline quality or cycle time.',
      uomType: 'MIN',
      target: 2,
      weightage: 15,
      rationale: 'Shows experimentation and process improvement.'
    }
  ]
};

function extractJson<T>(value: string): T {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Model response did not contain JSON');
  }
  return JSON.parse(match[0]) as T;
}

function scoreDimension(text: string, patterns: RegExp[]): number {
  const hits = patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  return Math.max(1, Math.min(5, 1 + hits));
}

async function completeJson<T>(system: string, userContent: string): Promise<T | null> {
  if (!client) {
    return null;
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system,
    messages: [{ role: 'user', content: userContent }]
  });

  const text = message.content
    .map((part) => ('text' in part ? part.text : ''))
    .join('\n')
    .trim();

  return extractJson<T>(text);
}

function inferAutopilotKey(jobTitle: string, department?: string) {
  const haystack = `${jobTitle} ${department ?? ''}`.toLowerCase();
  if (haystack.includes('manager') || haystack.includes('lead')) return 'manager';
  if (haystack.includes('revenue') || haystack.includes('sales') || haystack.includes('account')) return 'revenue';
  return 'engineer';
}

function fallbackConflictCheck(goals: GoalLike[]) {
  const conflicts: Array<{ goal1Index: number; goal2Index: number; reason: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' }> = [];
  const costTerms = /(reduce|cut|decrease).*(cost|spend|budget)|cost/i;
  const expansionTerms = /(launch|deploy|increase|scale|expand|build)/i;

  for (let i = 0; i < goals.length; i += 1) {
    for (let j = i + 1; j < goals.length; j += 1) {
      const a = `${goals[i].title ?? ''} ${goals[i].description ?? ''}`;
      const b = `${goals[j].title ?? ''} ${goals[j].description ?? ''}`;
      if ((costTerms.test(a) && expansionTerms.test(b)) || (costTerms.test(b) && expansionTerms.test(a))) {
        conflicts.push({
          goal1Index: i,
          goal2Index: j,
          reason: 'One goal aggressively constrains spending while the other expands delivery scope or infrastructure demand.',
          severity: 'HIGH'
        });
      }
    }
  }

  return { conflicts };
}

export async function smartRewrite(thrustArea: string, title: string, description: string) {
  const ai = await completeJson<{
    smartVersion: string;
    scores: Record<string, number>;
    suggestions: string[];
  }>(
    'You are a goal-writing coach. Rewrite rough goals into SMART goals. Return JSON only: { smartVersion: string, scores: { specific: number, measurable: number, achievable: number, relevant: number, timeBound: number }, suggestions: string[] }',
    `Thrust Area: ${thrustArea}\nTitle: ${title}\nDescription: ${description}`
  );

  if (ai) {
    return ai;
  }

  const text = `${title}. ${description}`;
  return {
    smartVersion: `${title}. ${description} Measure progress with a numeric target and review completion by the end of the active cycle.`,
    scores: {
      specific: scoreDimension(text, [/customer|prototype|platform|process|product/i]),
      measurable: scoreDimension(text, [/\d+|percent|%|reduce|increase|target/i]),
      achievable: 4,
      relevant: scoreDimension(text, [/revenue|innovation|efficiency|customer|quality/i]),
      timeBound: scoreDimension(text, [/quarter|month|week|year|deadline|date/i])
    },
    suggestions: [
      'Add a single numeric target the manager can verify quickly.',
      'Make the beneficiary or impacted workflow explicit.',
      'State the review deadline or quarter end.'
    ]
  };
}

export async function conflictCheck(goals: GoalLike[]) {
  const ai = await completeJson<{
    conflicts: Array<{ goal1Index: number; goal2Index: number; reason: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  }>(
    'You are an OKR expert. Review the provided goals and identify conflicts or direct tradeoffs. Return JSON only: { conflicts: [{ goal1Index: number, goal2Index: number, reason: string, severity: "HIGH"|"MEDIUM"|"LOW" }] }',
    JSON.stringify(goals)
  );

  return ai ?? fallbackConflictCheck(goals);
}

export async function suggestWeightage(goals: GoalLike[], thrustAreas: string[]) {
  const ai = await completeJson<{
    suggestions: Array<{ goalIndex: number; suggestedWeightage: number; rationale: string }>;
  }>(
    'You are an HR expert. Suggest a weightage distribution that adds to exactly 100%. Return JSON only: { suggestions: [{ goalIndex: number, suggestedWeightage: number, rationale: string }] }',
    JSON.stringify({ goals, thrustAreas })
  );

  if (ai) {
    return ai;
  }

  const even = goals.length ? Math.floor(100 / goals.length) : 0;
  const suggestions = goals.map((goal, index) => ({
    goalIndex: index,
    suggestedWeightage: index === goals.length - 1 ? 100 - even * Math.max(0, goals.length - 1) : even,
    rationale: `Balanced distribution across ${goal.thrustArea ?? 'core'} priorities.`
  }));
  return { suggestions };
}

export async function conversationalCheckin(goalId: string, quarter: string, messages: Array<{ role: string; content: string }>) {
  if (!client) {
    return {
      reply: `Share your progress for ${goalId} in ${quarter}. Include the actual result, current status, blockers, and any support you need.`,
      extractedData: null
    };
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system:
      'You are a friendly HR assistant conducting a quarterly goal check-in. Ask for measurable progress, current status, blockers, and next steps. When enough information is available, include JSON with actualValue, status, blockers, and employeeNote.',
    messages:
      messages.length > 0
        ? messages.map((item) => ({ role: item.role as 'user' | 'assistant', content: item.content }))
        : [{ role: 'user', content: `Starting check-in for goal ${goalId} in ${quarter}.` }]
  });

  const reply = message.content.map((part) => ('text' in part ? part.text : '')).join('\n');
  const jsonMatch = reply.match(/\{[\s\S]*"actualValue"[\s\S]*\}/);
  return {
    reply,
    extractedData: jsonMatch ? JSON.parse(jsonMatch[0]) : null
  };
}

export async function goalSummary(employeeGoalsData: unknown) {
  if (client) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system:
        'You are an HR analyst. Write a concise three-sentence summary of goal health, strengths, risks, and recommended manager actions.',
      messages: [{ role: 'user', content: JSON.stringify(employeeGoalsData) }]
    });
    return { summary: message.content.map((part) => ('text' in part ? part.text : '')).join('\n').trim() };
  }

  return {
    summary:
      'The employee has a mixed portfolio with visible momentum on core delivery goals. The primary risks are approval blockers, conflicting priorities, or low check-in consistency on sensitive goals. The manager should reinforce measurable milestones and remove the highest-impact execution blockers first.'
  };
}

export async function goalAutopilot(jobTitle: string, department?: string) {
  const ai = await completeJson<{
    goals: Array<{
      thrustArea: string;
      title: string;
      description: string;
      uomType: string;
      target: number;
      targetDate?: string | null;
      weightage: number;
      rationale: string;
    }>;
  }>(
    'You are a performance management expert. Based on a job title and optional department, generate exactly 5 SMART goals. Weightages must sum to exactly 100. Return JSON only: { goals: [{ thrustArea, title, description, uomType, target, targetDate, weightage, rationale }] }',
    JSON.stringify({ jobTitle, department })
  );

  if (ai?.goals?.length === 5) {
    return ai;
  }

  return { goals: AUTOPILOT_LIBRARY[inferAutopilotKey(jobTitle, department)] };
}
