"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshGoalConflictAlerts = refreshGoalConflictAlerts;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const ai_service_1 = require("./ai.service");
async function refreshGoalConflictAlerts(goals) {
    if (goals.length < 2) {
        return [];
    }
    const result = await (0, ai_service_1.conflictCheck)(goals);
    const cycleId = goals[0].cycleId;
    const tenantId = goals[0].tenantId;
    const department = goals[0].user?.department ?? 'Unknown';
    const existing = await prisma_1.prisma.goalConflictAlert.findMany({
        where: { tenantId, cycleId, department, status: client_1.GoalConflictStatus.OPEN }
    });
    const keepKeys = new Set();
    for (const item of result.conflicts) {
        const goalA = goals[item.goal1Index];
        const goalB = goals[item.goal2Index];
        if (!goalA || !goalB) {
            continue;
        }
        const key = [goalA.id, goalB.id].sort().join(':');
        keepKeys.add(key);
        const current = existing.find((alert) => [alert.goalAId, alert.goalBId].sort().join(':') === key);
        if (current) {
            await prisma_1.prisma.goalConflictAlert.update({
                where: { id: current.id },
                data: {
                    severity: item.severity,
                    reason: item.reason,
                    detectedAt: new Date(),
                    status: client_1.GoalConflictStatus.OPEN
                }
            });
            continue;
        }
        await prisma_1.prisma.goalConflictAlert.create({
            data: {
                tenantId,
                goalAId: goalA.id,
                goalBId: goalB.id,
                cycleId,
                department,
                severity: item.severity,
                reason: item.reason,
                status: client_1.GoalConflictStatus.OPEN
            }
        });
    }
    const stale = existing.filter((alert) => !keepKeys.has([alert.goalAId, alert.goalBId].sort().join(':')));
    if (stale.length > 0) {
        await prisma_1.prisma.goalConflictAlert.updateMany({
            where: { id: { in: stale.map((alert) => alert.id) } },
            data: { status: client_1.GoalConflictStatus.RESOLVED }
        });
    }
    return prisma_1.prisma.goalConflictAlert.findMany({
        where: { tenantId, cycleId, department, status: client_1.GoalConflictStatus.OPEN },
        orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }]
    });
}
