"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSentimentScore = calculateSentimentScore;
exports.buildTeamSentimentSummary = buildTeamSentimentSummary;
const prisma_1 = require("../lib/prisma");
const POSITIVE_TERMS = [
    'great',
    'good',
    'excellent',
    'improved',
    'stable',
    'happy',
    'strong',
    'support',
    'clear',
    'momentum',
    'confident',
    'delivered',
    'helpful'
];
const NEGATIVE_TERMS = [
    'burnout',
    'blocked',
    'delay',
    'overwhelmed',
    'stuck',
    'risk',
    'frustrated',
    'late',
    'issue',
    'pressure',
    'fatigue',
    'unclear',
    'slipping'
];
function normalize(text) {
    return text.toLowerCase();
}
function calculateSentimentScore(parts) {
    const text = parts.filter(Boolean).join(' ').trim();
    if (!text) {
        return 0;
    }
    const normalized = normalize(text);
    const positive = POSITIVE_TERMS.reduce((count, term) => count + (normalized.includes(term) ? 1 : 0), 0);
    const negative = NEGATIVE_TERMS.reduce((count, term) => count + (normalized.includes(term) ? 1 : 0), 0);
    const raw = (positive - negative) / Math.max(1, positive + negative);
    return Math.max(-1, Math.min(1, Number(raw.toFixed(3))));
}
async function buildTeamSentimentSummary(managerId) {
    const where = managerId
        ? { goal: { user: { managerId } } }
        : {};
    const checkIns = await prisma_1.prisma.checkIn.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, department: true, managerId: true } },
            goal: { select: { title: true, sensitivity: true } }
        },
        orderBy: [{ quarter: 'asc' }, { createdAt: 'asc' }]
    });
    const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
    const trends = quarterOrder.map((quarter) => {
        const entries = checkIns.filter((checkIn) => checkIn.quarter === quarter && typeof checkIn.sentiment === 'number');
        const average = entries.length > 0
            ? Number((entries.reduce((sum, entry) => sum + (entry.sentiment ?? 0), 0) / entries.length).toFixed(3))
            : 0;
        return { quarter, avgSentiment: average, sampleSize: entries.length };
    });
    const latestTrend = [...trends].reverse().find((trend) => trend.sampleSize > 0) ?? trends[0];
    const previousTrend = [...trends]
        .reverse()
        .filter((trend) => trend.sampleSize > 0)[1];
    const drop = previousTrend ? Number((latestTrend.avgSentiment - previousTrend.avgSentiment).toFixed(3)) : 0;
    const burnoutRisk = {
        high: checkIns.filter((entry) => (entry.sentiment ?? 0) <= -0.25).length,
        medium: checkIns.filter((entry) => (entry.sentiment ?? 0) > -0.25 && (entry.sentiment ?? 0) < 0.1).length,
        low: checkIns.filter((entry) => (entry.sentiment ?? 0) >= 0.1).length
    };
    const alerts = [];
    if (latestTrend.sampleSize >= 3 && latestTrend.avgSentiment <= -0.15) {
        alerts.push('Latest team sentiment is below the burnout threshold.');
    }
    if (latestTrend.sampleSize >= 3 && previousTrend && drop <= -0.3) {
        alerts.push('Team sentiment dropped sharply compared with the previous quarter.');
    }
    const healthyEntries = checkIns.filter((entry) => (entry.sentiment ?? 0) >= 0.1).length;
    const engagementScore = checkIns.length > 0 ? Number(((healthyEntries / checkIns.length) * 100).toFixed(1)) : 0;
    return {
        trends,
        burnoutRisk,
        engagementScore,
        latestAverage: latestTrend.avgSentiment,
        alertFlags: alerts
    };
}
