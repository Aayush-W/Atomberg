"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyGoalProgressSync = applyGoalProgressSync;
exports.buildChatOpsReply = buildChatOpsReply;
const prisma_1 = require("../lib/prisma");
const checkinProgress_service_1 = require("./checkinProgress.service");
async function applyGoalProgressSync(payload) {
    const goal = await prisma_1.prisma.goal.findUnique({
        where: { id: payload.goalId },
        include: {
            cycle: true,
            checkIns: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });
    if (!goal) {
        throw new Error('Goal not found');
    }
    const quarter = payload.quarter ?? (0, checkinProgress_service_1.quarterFromDate)(goal.cycle.startDate, payload.eventTimestamp ?? new Date());
    const existing = goal.checkIns.find((entry) => entry.quarter === quarter);
    const baseActual = payload.actualValue ?? ((existing?.actualValue ?? 0) + (payload.incrementBy ?? 0));
    const progressScore = (0, checkinProgress_service_1.computeProgress)(goal, { actualValue: baseActual, completionDate: payload.eventTimestamp ?? null });
    const status = payload.status ?? (0, checkinProgress_service_1.deriveCheckInStatus)(progressScore);
    const providerLabel = payload.provider.toUpperCase();
    const employeeNote = [payload.eventTitle, payload.note].filter(Boolean).join(' - ') || `${providerLabel} sync received`;
    const data = {
        actualValue: baseActual,
        status,
        progressScore,
        employeeNote,
        sentiment: null
    };
    const checkIn = existing
        ? await prisma_1.prisma.checkIn.update({
            where: { id: existing.id },
            data
        })
        : await prisma_1.prisma.checkIn.create({
            data: {
                ...data,
                goalId: goal.id,
                userId: goal.userId,
                quarter
            }
        });
    await prisma_1.prisma.auditLog.create({
        data: {
            goalId: goal.id,
            userId: payload.actorUserId ?? goal.userId,
            action: `INTEGRATION_SYNC_${providerLabel}`,
            field: 'actualValue',
            oldValue: existing ? String(existing.actualValue) : null,
            newValue: String(checkIn.actualValue)
        }
    });
    return {
        goal,
        checkIn,
        quarter,
        progressScore,
        status,
        message: `${providerLabel} sync applied to "${goal.title}". Progress is now ${Math.min(progressScore, 999)}%.`
    };
}
function buildChatOpsReply(args) {
    return `${args.actionLabel} "${args.goal.title}". Progress is now ${Math.min(args.progressScore, 999)}%.`;
}
