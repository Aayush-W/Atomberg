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
exports.goalSummary = exports.conversationalCheckin = exports.suggestWeightage = exports.conflictCheck = exports.smartRewrite = void 0;
const aiSvc = __importStar(require("../services/ai.service"));
const prisma_1 = require("../lib/prisma");
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
        const goals = await prisma_1.prisma.goal.findMany({
            where: { userId: employeeId },
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
