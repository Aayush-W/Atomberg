"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditForGoal = exports.getAuditLog = void 0;
const prisma_1 = require("../lib/prisma");
const getAuditLog = async (req, res, next) => {
    try {
        const { userId, goalId, from, to, limit = '100' } = req.query;
        const logs = await prisma_1.prisma.auditLog.findMany({
            where: {
                ...(userId && { userId }),
                ...(goalId && { goalId }),
                ...(from || to ? {
                    timestamp: {
                        ...(from && { gte: new Date(from) }),
                        ...(to && { lte: new Date(to) }),
                    },
                } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true, role: true } }, goal: { select: { id: true, title: true } } },
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
        });
        res.json(logs);
    }
    catch (err) {
        next(err);
    }
};
exports.getAuditLog = getAuditLog;
const getAuditForGoal = async (req, res, next) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({
            where: { goalId: req.params.goalId },
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { timestamp: 'desc' },
        });
        res.json(logs);
    }
    catch (err) {
        next(err);
    }
};
exports.getAuditForGoal = getAuditForGoal;
