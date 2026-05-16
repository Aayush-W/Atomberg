"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartRewrite = smartRewrite;
exports.conflictCheck = conflictCheck;
exports.suggestWeightage = suggestWeightage;
exports.conversationalCheckin = conversationalCheckin;
exports.goalSummary = goalSummary;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
async function smartRewrite(thrustArea, title, description) {
    const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a goal-writing coach. Given an employee\'s rough goal, rewrite it as a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound). Also score the original on each SMART dimension (1-5). Return JSON only: { smartVersion: string, scores: { specific: number, measurable: number, achievable: number, relevant: number, timeBound: number }, suggestions: string[] }',
        messages: [{ role: 'user', content: `Thrust Area: ${thrustArea}. Title: ${title}. Description: ${description}` }],
    });
    const text = msg.content[0].text;
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
}
async function conflictCheck(goals) {
    const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are an OKR expert. Review this employee\'s goals and identify any that conflict with or undermine each other. Return JSON: { conflicts: [{ goal1Index: number, goal2Index: number, reason: string, severity: "HIGH"|"MEDIUM"|"LOW" }] }',
        messages: [{ role: 'user', content: JSON.stringify(goals) }],
    });
    const text = msg.content[0].text;
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
}
async function suggestWeightage(goals, thrustAreas) {
    const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are an HR expert. Given these goals and the organizational thrust areas, suggest a weightage distribution that adds up to exactly 100%. Prioritize goals aligned with primary thrust areas. Return JSON: { suggestions: [{ goalIndex: number, suggestedWeightage: number, rationale: string }] }',
        messages: [{ role: 'user', content: JSON.stringify({ goals, thrustAreas }) }],
    });
    const text = msg.content[0].text;
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
}
async function conversationalCheckin(goalId, quarter, messages) {
    const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: 'You are a friendly HR assistant conducting a quarterly goal check-in. Ask the employee about their progress on each goal one at a time. Extract: actual achievement value (number), completion status (NOT_STARTED/ON_TRACK/COMPLETED), and any blockers. Once you have data for a goal, confirm it and move to the next. When all goals are covered, return the extracted data as JSON in a final message. Keep your tone warm and concise.',
        messages: messages.length > 0 ? messages : [{ role: 'user', content: `Starting check-in for goal ${goalId} for ${quarter}. Please begin.` }],
    });
    const reply = msg.content[0].text;
    // Try to extract structured data
    const jsonMatch = reply.match(/\{[\s\S]*"actualValue"[\s\S]*\}/);
    const extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    return { reply, extractedData };
}
async function goalSummary(employeeGoalsData) {
    const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: 'You are an HR analyst. Write a 3-sentence natural language summary of this employee\'s goal health, highlighting strengths, risks, and recommended actions for their manager.',
        messages: [{ role: 'user', content: JSON.stringify(employeeGoalsData) }],
    });
    return { summary: msg.content[0].text };
}
