"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEscalationCheck = runEscalationCheck;
exports.startEscalationJob = startEscalationJob;
const node_cron_1 = __importDefault(require("node-cron"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const cycleRules_service_1 = require("../services/cycleRules.service");
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
async function sendEmail(to, subject, text) {
    try {
        await transporter.sendMail({ from: 'GoalForge <noreply@goalforge.com>', to, subject, text });
    }
    catch {
        console.log(`[Escalation] Email to ${to}: ${subject}`);
    }
}
async function logEscalationOnce(input) {
    const existing = await prisma_1.prisma.escalationEvent.findUnique({ where: { uniqueKey: input.uniqueKey } });
    if (existing) {
        return false;
    }
    await prisma_1.prisma.escalationEvent.create({
        data: {
            tenantId: input.tenantId,
            uniqueKey: input.uniqueKey,
            ruleId: input.ruleId,
            recipientUserId: input.recipientUserId,
            cycleId: input.cycleId,
            quarter: input.quarter,
            triggerType: input.triggerType,
            phase: input.phase,
            message: input.message,
            metadata: input.metadata
        }
    });
    return true;
}
async function notify(tenantId, userId, type, title, message, channel = client_1.NotificationChannel.IN_APP, metadata) {
    await prisma_1.prisma.notification.create({
        data: { tenantId, userId, type, title, message, channel, metadata: metadata }
    });
}
async function handleGoalNotSubmitted(tenantId, ruleId, triggerType, daysThreshold, cycleId, cycleName) {
    const cycle = await prisma_1.prisma.cycle.findFirst({ where: { tenantId, id: cycleId } });
    if (!cycle)
        return;
    const daysSinceOpen = Math.floor((Date.now() - cycle.goalSettingOpen.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceOpen < daysThreshold) {
        return;
    }
    const employees = await prisma_1.prisma.user.findMany({ where: { tenantId, role: 'EMPLOYEE' } });
    for (const employee of employees) {
        const submitted = await prisma_1.prisma.goal.count({
            where: {
                userId: employee.id,
                cycleId,
                status: { not: 'DRAFT' }
            }
        });
        if (submitted > 0)
            continue;
        const uniqueKey = `${ruleId}:${employee.id}:GOAL_NOT_SUBMITTED:ESCALATED`;
        const created = await logEscalationOnce({
            uniqueKey,
            tenantId,
            ruleId,
            recipientUserId: employee.id,
            cycleId,
            triggerType,
            phase: client_1.EscalationPhase.ESCALATED,
            message: `Goals have not been submitted for ${cycleName}.`,
            metadata: { daysSinceOpen }
        });
        if (!created)
            continue;
        await notify(tenantId, employee.id, 'ESCALATION_GOAL_NOT_SUBMITTED', 'Goals not submitted', `You have not submitted goals for ${cycleName}.`);
        await sendEmail(employee.email, 'Action required: submit your goals', `Please submit your goals for ${cycleName}.`);
        if (employee.managerId) {
            const manager = await prisma_1.prisma.user.findUnique({ where: { id: employee.managerId } });
            if (manager) {
                await notify(tenantId, manager.id, 'ESCALATION_GOAL_NOT_SUBMITTED', `${employee.name} has not submitted goals`, `${employee.name} has not submitted goals for ${cycleName}.`);
            }
        }
    }
}
async function handleApprovalPending(tenantId, ruleId, triggerType, daysThreshold, cycleId) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    const pendingGoals = await prisma_1.prisma.goal.findMany({
        where: { tenantId, cycleId, status: 'SUBMITTED', updatedAt: { lte: thresholdDate } },
        include: { user: true }
    });
    for (const goal of pendingGoals) {
        if (!goal.user.managerId)
            continue;
        const manager = await prisma_1.prisma.user.findUnique({ where: { id: goal.user.managerId } });
        if (!manager)
            continue;
        const uniqueKey = `${ruleId}:${goal.id}:APPROVAL_PENDING:ESCALATED`;
        const created = await logEscalationOnce({
            uniqueKey,
            tenantId,
            ruleId,
            recipientUserId: manager.id,
            cycleId,
            triggerType,
            phase: client_1.EscalationPhase.ESCALATED,
            message: `${goal.user.name}'s goal "${goal.title}" is awaiting approval.`,
            metadata: { goalId: goal.id }
        });
        if (!created)
            continue;
        await notify(tenantId, manager.id, 'ESCALATION_APPROVAL_PENDING', 'Goals awaiting approval', `${goal.user.name}'s goal "${goal.title}" has been pending approval for ${daysThreshold}+ days.`);
        await sendEmail(manager.email, `Approve ${goal.user.name}'s goals`, `Goals submitted by ${goal.user.name} are still awaiting your approval.`);
    }
}
async function handleCheckinMissing(tenantId, ruleId, triggerType, cycleId) {
    const cycle = await prisma_1.prisma.cycle.findFirst({ where: { tenantId, id: cycleId } });
    if (!cycle)
        return;
    const status = (0, cycleRules_service_1.cycleStatus)(cycle);
    const quarterEntries = Object.entries(status.checkIns);
    const employees = await prisma_1.prisma.user.findMany({ where: { tenantId, role: 'EMPLOYEE' } });
    for (const [quarter, window] of quarterEntries) {
        const daysRemaining = Math.ceil((window.closesAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        for (const employee of employees) {
            const approvedGoals = await prisma_1.prisma.goal.findMany({
                where: { userId: employee.id, cycleId, status: { in: ['APPROVED', 'LOCKED'] } }
            });
            if (approvedGoals.length === 0)
                continue;
            const hasCheckIn = await prisma_1.prisma.checkIn.count({
                where: { userId: employee.id, quarter, goal: { cycleId } }
            });
            if (hasCheckIn > 0)
                continue;
            if (daysRemaining <= 3 && daysRemaining >= 0) {
                const uniqueKey = `${ruleId}:${employee.id}:${quarter}:NUDGE`;
                const created = await logEscalationOnce({
                    uniqueKey,
                    tenantId,
                    ruleId,
                    recipientUserId: employee.id,
                    cycleId,
                    quarter,
                    triggerType,
                    phase: client_1.EscalationPhase.NUDGE,
                    message: `${quarter} check-in is due in ${daysRemaining} days.`,
                    metadata: { daysRemaining }
                });
                if (!created)
                    continue;
                await notify(tenantId, employee.id, 'ESCALATION_CHECKIN_NUDGE', `${quarter} check-in due soon`, `Your ${quarter} check-in is due in ${daysRemaining} day(s).`, client_1.NotificationChannel.IN_APP, { daysRemaining, quarter });
                await sendEmail(employee.email, `${quarter} check-in reminder`, `Your ${quarter} check-in is due in ${daysRemaining} day(s).`);
            }
            if (daysRemaining < 0) {
                const uniqueKey = `${ruleId}:${employee.id}:${quarter}:ESCALATED`;
                const managerId = employee.managerId;
                if (!managerId)
                    continue;
                const created = await logEscalationOnce({
                    uniqueKey,
                    tenantId,
                    ruleId,
                    recipientUserId: managerId,
                    cycleId,
                    quarter,
                    triggerType,
                    phase: client_1.EscalationPhase.ESCALATED,
                    message: `${employee.name} missed the ${quarter} check-in window.`,
                    metadata: { overdueDays: Math.abs(daysRemaining) }
                });
                if (!created)
                    continue;
                const manager = await prisma_1.prisma.user.findUnique({ where: { id: managerId } });
                if (!manager)
                    continue;
                await notify(tenantId, manager.id, 'ESCALATION_CHECKIN_MISSING', `${employee.name} missed ${quarter} check-in`, `${employee.name} has not completed the ${quarter} check-in.`, client_1.NotificationChannel.IN_APP, { quarter, employeeId: employee.id });
                await sendEmail(manager.email, `${employee.name} missed ${quarter} check-in`, `${employee.name} has not completed the ${quarter} check-in.`);
            }
        }
    }
}
async function runEscalationCheck(tenantId) {
    console.log('[Escalation] Running check...');
    const cycles = await prisma_1.prisma.cycle.findMany({
        where: { ...(tenantId ? { tenantId } : {}), isActive: true },
        orderBy: { startDate: 'desc' }
    });
    for (const cycle of cycles) {
        const rules = await prisma_1.prisma.escalationRule.findMany({ where: { tenantId: cycle.tenantId, isActive: true } });
        for (const rule of rules) {
            if (rule.triggerType === 'GOAL_NOT_SUBMITTED') {
                await handleGoalNotSubmitted(cycle.tenantId, rule.id, rule.triggerType, rule.daysThreshold, cycle.id, cycle.name);
            }
            if (rule.triggerType === 'APPROVAL_PENDING') {
                await handleApprovalPending(cycle.tenantId, rule.id, rule.triggerType, rule.daysThreshold, cycle.id);
            }
            if (rule.triggerType === 'CHECKIN_MISSING') {
                await handleCheckinMissing(cycle.tenantId, rule.id, rule.triggerType, cycle.id);
            }
        }
    }
    console.log('[Escalation] Check complete.');
}
function startEscalationJob() {
    node_cron_1.default.schedule('0 */6 * * *', () => {
        void runEscalationCheck();
    });
    console.log('[Escalation] Job registered (every 6h)');
}
