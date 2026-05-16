"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerManual = exports.getLog = exports.updateRule = exports.createRule = exports.getRules = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const escalation_job_1 = require("../jobs/escalation.job");
const RuleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    triggerType: zod_1.z.enum(['GOAL_NOT_SUBMITTED', 'APPROVAL_PENDING', 'CHECKIN_MISSING']),
    daysThreshold: zod_1.z.number().int().positive(),
    isActive: zod_1.z.boolean().default(true),
    escalationChain: zod_1.z.array(zod_1.z.object({ level: zod_1.z.number(), notifyRole: zod_1.z.string() })).default([
        { level: 1, notifyRole: 'MANAGER' },
        { level: 2, notifyRole: 'ADMIN' },
    ]),
});
const getRules = async (_req, res, next) => {
    try {
        res.json(await prisma_1.prisma.escalationRule.findMany({ orderBy: { id: 'asc' } }));
    }
    catch (err) {
        next(err);
    }
};
exports.getRules = getRules;
const createRule = async (req, res, next) => {
    try {
        const data = RuleSchema.parse(req.body);
        res.status(201).json(await prisma_1.prisma.escalationRule.create({ data }));
    }
    catch (err) {
        next(err);
    }
};
exports.createRule = createRule;
const updateRule = async (req, res, next) => {
    try {
        const data = RuleSchema.partial().parse(req.body);
        res.json(await prisma_1.prisma.escalationRule.update({ where: { id: req.params.id }, data }));
    }
    catch (err) {
        next(err);
    }
};
exports.updateRule = updateRule;
const getLog = async (_req, res, next) => {
    try {
        // Return recent notifications of escalation type
        const logs = await prisma_1.prisma.notification.findMany({
            where: { type: { startsWith: 'ESCALATION' } },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { user: { select: { name: true, email: true } } },
        });
        res.json(logs);
    }
    catch (err) {
        next(err);
    }
};
exports.getLog = getLog;
const triggerManual = async (_req, res, next) => {
    try {
        await (0, escalation_job_1.runEscalationCheck)();
        res.json({ ok: true, message: 'Escalation check triggered' });
    }
    catch (err) {
        next(err);
    }
};
exports.triggerManual = triggerManual;
