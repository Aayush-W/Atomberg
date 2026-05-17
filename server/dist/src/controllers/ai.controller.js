"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativeIntelligence = exports.calibrationCopilot = exports.performanceReviewDraft = exports.goalAutopilot = exports.goalSummary = exports.conversationalCheckin = exports.suggestWeightage = exports.conflictCheck = exports.smartRewrite = void 0;
const client_1 = require("@prisma/client");
const aiSvc = __importStar(require("../services/ai.service"));
const prisma_1 = require("../lib/prisma");
const _helpers_1 = require("./_helpers");
const errors_1 = require("../utils/errors");
const decisionIntelligence_service_1 = require("../services/decisionIntelligence.service");
const domainEvent_service_1 = require("../services/domainEvent.service");
const AI_UNAVAILABLE = { error: { code: 'AI_UNAVAILABLE', message: 'AI service temporarily unavailable. Please try again later.' } };
const smartRewrite = async (req, res, next) => {
    try {
        const { thrustArea, title, description } = req.body;
        if (!title || !description)
            return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'title and description required' } });
        const result = await aiSvc.smartRewrite(thrustArea || '', title, description);
        res.json(result);
    }
    catch (err) {
        if (err?.status === 529 || err?.message?.includes('timeout'))
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.smartRewrite = smartRewrite;
const conflictCheck = async (req, res, next) => {
    try {
        const { goals } = req.body;
        if (!Array.isArray(goals) || goals.length === 0)
            return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'goals array required' } });
        const result = await aiSvc.conflictCheck(goals);
        res.json(result);
    }
    catch (err) {
        if (err?.status === 529 || err?.message?.includes('timeout'))
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.conflictCheck = conflictCheck;
const suggestWeightage = async (req, res, next) => {
    try {
        const { goals, thrustAreas } = req.body;
        const result = await aiSvc.suggestWeightage(goals, thrustAreas);
        res.json(result);
    }
    catch (err) {
        if (err?.status === 529)
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.suggestWeightage = suggestWeightage;
const conversationalCheckin = async (req, res, next) => {
    try {
        const { goalId, quarter, messages = [] } = req.body;
        const result = await aiSvc.conversationalCheckin(goalId, quarter, messages);
        res.json(result);
    }
    catch (err) {
        if (err?.status === 529)
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.conversationalCheckin = conversationalCheckin;
const goalSummary = async (req, res, next) => {
    try {
        const { employeeId } = req.body;
        const user = (0, _helpers_1.currentUser)(req);
        const goals = await prisma_1.prisma.goal.findMany({
            where: { tenantId: user.tenantId, userId: employeeId },
            include: { checkIns: true },
        });
        const result = await aiSvc.goalSummary({ goals });
        res.json(result);
    }
    catch (err) {
        if (err?.status === 529)
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.goalSummary = goalSummary;
const goalAutopilot = async (req, res, next) => {
    try {
        const jobTitle = req.body.jobTitle || req.user?.jobTitle;
        if (!jobTitle) {
            return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'jobTitle is required' } });
        }
        const result = await aiSvc.goalAutopilot(jobTitle, req.body.department || req.user?.department);
        res.json(result);
    }
    catch (err) {
        if (err?.status === 529 || err?.message?.includes('timeout'))
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.goalAutopilot = goalAutopilot;
const performanceReviewDraft = async (req, res, next) => {
    try {
        const user = (0, _helpers_1.currentUser)(req);
        const employeeId = typeof req.body.employeeId === 'string' ? req.body.employeeId : null;
        if (!employeeId) {
            return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'employeeId is required' } });
        }
        const employee = await prisma_1.prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                tenant: true,
                manager: { select: { id: true, name: true } },
                goals: {
                    include: {
                        checkIns: { orderBy: { createdAt: 'asc' } }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                kudosReceived: {
                    include: {
                        sender: { select: { name: true, department: true } },
                        goal: { select: { title: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                checkIns: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!employee) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
        }
        if (employee.tenantId !== user.tenantId) {
            throw (0, errors_1.forbidden)('Employee is outside your tenant');
        }
        if (user.role === client_1.Role.MANAGER && employee.managerId !== user.id) {
            throw (0, errors_1.forbidden)('Managers can only draft reviews for their direct reportees');
        }
        const sentiments = employee.checkIns.map((entry) => entry.sentiment).filter((value) => typeof value === 'number');
        const goalsCompleted = employee.goals.filter((goal) => goal.status === 'LOCKED' || goal.status === 'APPROVED').length;
        const averageProgress = employee.goals.length
            ? employee.goals.reduce((sum, goal) => sum + (goal.checkIns.at(-1)?.progressScore ?? 0), 0) / employee.goals.length
            : 0;
        const result = await aiSvc.draftPerformanceReview({
            employeeName: employee.name,
            managerName: employee.manager?.name,
            cycleName: employee.goals[0]?.cycleId ?? null,
            summaryMetrics: {
                goalsCompleted,
                averageProgress: Number(averageProgress.toFixed(1)),
                kudosCount: employee.kudosReceived.length,
                averageSentiment: sentiments.length
                    ? Number((sentiments.reduce((sum, value) => sum + value, 0) / sentiments.length).toFixed(3))
                    : 0
            },
            goals: employee.goals.map((goal) => ({
                title: goal.title,
                thrustArea: goal.thrustArea,
                target: goal.target,
                status: goal.status,
                progressScore: goal.checkIns.at(-1)?.progressScore ?? 0,
                managerComment: goal.managerComment
            })),
            checkIns: employee.checkIns.map((entry) => ({
                quarter: entry.quarter,
                actualValue: entry.actualValue,
                status: entry.status,
                progressScore: entry.progressScore,
                sentiment: entry.sentiment,
                employeeNote: entry.employeeNote,
                managerComment: entry.managerComment
            })),
            kudos: employee.kudosReceived.map((entry) => ({
                badgeType: entry.badgeType,
                note: entry.note,
                senderName: entry.sender.name,
                goalTitle: entry.goal?.title ?? null
            }))
        });
        await (0, domainEvent_service_1.emitDomainEvent)({
            tenantId: user.tenantId,
            eventName: 'review.generated',
            aggregateType: 'user',
            aggregateId: employee.id,
            payload: {
                employeeId: employee.id,
                employeeName: employee.name,
                managerId: employee.managerId,
                highlights: result.highlights
            }
        });
        res.json({
            employee: {
                id: employee.id,
                name: employee.name,
                managerName: employee.manager?.name ?? null
            },
            ...result
        });
    }
    catch (err) {
        if (err?.status === 529 || err?.message?.includes('timeout'))
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.performanceReviewDraft = performanceReviewDraft;
const calibrationCopilot = async (req, res, next) => {
    try {
        const user = (0, _helpers_1.currentUser)(req);
        const managerId = user.role === client_1.Role.MANAGER && !req.query.managerId ? user.id : req.query.managerId;
        const result = await (0, decisionIntelligence_service_1.buildCalibrationCopilot)(user.tenantId, managerId);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.calibrationCopilot = calibrationCopilot;
const narrativeIntelligence = async (req, res, next) => {
    try {
        const user = (0, _helpers_1.currentUser)(req);
        const managerId = user.role === client_1.Role.MANAGER && !req.query.managerId ? user.id : req.query.managerId;
        const inputs = await (0, decisionIntelligence_service_1.buildNarrativeInputs)(user.tenantId, managerId);
        const result = await aiSvc.narrativeIntelligence(inputs);
        res.json({ ...inputs, ...result });
    }
    catch (err) {
        if (err?.status === 529 || err?.message?.includes('timeout'))
            return res.status(503).json(AI_UNAVAILABLE);
        next(err);
    }
};
exports.narrativeIntelligence = narrativeIntelligence;
