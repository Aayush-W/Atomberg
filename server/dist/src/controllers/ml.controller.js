"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatIfSimulation = exports.flightRisk = exports.teamSentiment = exports.sentimentTrends = exports.suggestThrustArea = exports.getAnomalies = exports.goalQuality = exports.predictAchievement = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const sentiment_service_1 = require("../services/sentiment.service");
const risk_service_1 = require("../services/risk.service");
const decisionIntelligence_service_1 = require("../services/decisionIntelligence.service");
const domainEvent_service_1 = require("../services/domainEvent.service");
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ML_UNAVAILABLE = { error: { code: 'ML_UNAVAILABLE', message: 'AI insights temporarily unavailable.' } };
async function callML(path, data) {
    return axios_1.default.post(`${ML_URL}${path}`, data, { timeout: 10000 });
}
const predictAchievement = async (req, res, next) => {
    try {
        const { data } = await callML('/predict-achievement', req.body);
        res.json(data);
    }
    catch {
        res.status(503).json(ML_UNAVAILABLE);
    }
};
exports.predictAchievement = predictAchievement;
const goalQuality = async (req, res, next) => {
    try {
        const { data } = await callML('/goal-quality', req.body);
        res.json(data);
    }
    catch {
        res.status(503).json(ML_UNAVAILABLE);
    }
};
exports.goalQuality = goalQuality;
const getAnomalies = async (req, res, next) => {
    try {
        const { data } = await axios_1.default.get(`${ML_URL}/anomalies`, { params: req.query, timeout: 10000 });
        res.json(data);
    }
    catch {
        res.status(503).json(ML_UNAVAILABLE);
    }
};
exports.getAnomalies = getAnomalies;
const suggestThrustArea = async (req, res, next) => {
    try {
        const { data } = await callML('/suggest-thrust-area', req.body);
        res.json(data);
    }
    catch {
        res.status(503).json(ML_UNAVAILABLE);
    }
};
exports.suggestThrustArea = suggestThrustArea;
const sentimentTrends = async (req, res, next) => {
    try {
        const managerId = req.user?.role === client_1.Role.MANAGER && !req.query.managerId ? req.user.id : req.query.managerId;
        const summary = await (0, sentiment_service_1.buildTeamSentimentSummary)(req.user.tenantId, managerId);
        res.json({ trends: summary.trends });
    }
    catch {
        res.status(503).json(ML_UNAVAILABLE);
    }
};
exports.sentimentTrends = sentimentTrends;
const teamSentiment = async (req, res, next) => {
    try {
        const managerId = req.user?.role === client_1.Role.MANAGER && !req.query.managerId ? req.user.id : req.query.managerId;
        const summary = await (0, sentiment_service_1.buildTeamSentimentSummary)(req.user.tenantId, managerId);
        res.json(summary);
    }
    catch (error) {
        next(error);
    }
};
exports.teamSentiment = teamSentiment;
const flightRisk = async (req, res, next) => {
    try {
        const managerId = req.user?.role === client_1.Role.MANAGER && !req.query.managerId ? req.user.id : req.query.managerId;
        const report = await (0, risk_service_1.buildFlightRiskReport)(req.user.tenantId, managerId);
        await Promise.all(report.employees
            .filter((item) => item.riskLevel === 'HIGH')
            .slice(0, 3)
            .map((item) => (0, domainEvent_service_1.emitDomainEvent)({
            tenantId: req.user.tenantId,
            eventName: 'risk.detected',
            aggregateType: 'user',
            aggregateId: item.userId,
            payload: {
                userId: item.userId,
                userName: item.userName,
                riskScore: item.riskScore,
                reasons: item.reasons,
                confidence: item.confidence
            }
        })));
        res.json(report);
    }
    catch (error) {
        next(error);
    }
};
exports.flightRisk = flightRisk;
const whatIfSimulation = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        }
        const goalId = typeof req.body.goalId === 'string' ? req.body.goalId : null;
        const newWeightage = typeof req.body.newWeightage === 'number' ? req.body.newWeightage : null;
        if (!goalId || newWeightage == null) {
            return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'goalId and newWeightage are required' } });
        }
        const result = await (0, decisionIntelligence_service_1.runWhatIfSimulation)({
            tenantId: user.tenantId,
            requesterRole: user.role,
            requesterId: user.id,
            goalId,
            newWeightage
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.whatIfSimulation = whatIfSimulation;
