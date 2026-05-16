import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendEmail(to: string, subject: string, text: string) {
  try {
    await transporter.sendMail({ from: 'GoalForge <noreply@goalforge.com>', to, subject, text });
  } catch (e) {
    console.log(`[Escalation] Email to ${to}: ${subject}`); // Log to console if SMTP not configured
  }
}

export async function runEscalationCheck() {
  console.log('[Escalation] Running check…');
  const rules = await prisma.escalationRule.findMany({ where: { isActive: true } });
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) return;

  for (const rule of rules) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - rule.daysThreshold);

    if (rule.triggerType === 'GOAL_NOT_SUBMITTED') {
      // Find employees with no submitted goals after N days of cycle start
      const cycleStart = new Date(cycle.goalSettingOpen);
      if (new Date() < cycleStart) continue;

      const allEmployees = await prisma.user.findMany({ where: { role: 'EMPLOYEE' } });
      for (const emp of allEmployees) {
        const submitted = await prisma.goal.count({ where: { userId: emp.id, cycleId: cycle.id, status: { not: 'DRAFT' } } });
        if (submitted === 0) {
          const daysSinceOpen = Math.floor((Date.now() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceOpen >= rule.daysThreshold) {
            await prisma.notification.create({
              data: { userId: emp.id, type: 'ESCALATION_GOAL_NOT_SUBMITTED', title: 'Goals Not Submitted', message: `You have not submitted your goals for ${cycle.name}. Please do so immediately.` },
            });
            await sendEmail(emp.email, 'Action Required: Submit Your Goals', `Dear ${emp.name},\n\nYou have not submitted your goals for ${cycle.name}. Please submit them as soon as possible.\n\nGoalForge`);
            // Level 2 — notify manager
            if (emp.managerId) {
              const mgr = await prisma.user.findUnique({ where: { id: emp.managerId } });
              if (mgr) {
                await prisma.notification.create({ data: { userId: mgr.id, type: 'ESCALATION_GOAL_NOT_SUBMITTED', title: `${emp.name} Has Not Submitted Goals`, message: `${emp.name} has not submitted goals after ${daysSinceOpen} days.` } });
                await sendEmail(mgr.email, `Follow Up: ${emp.name} Goals Not Submitted`, `Dear ${mgr.name},\n\n${emp.name} has still not submitted goals for ${cycle.name}.\n\nGoalForge`);
              }
            }
          }
        }
      }
    }

    if (rule.triggerType === 'APPROVAL_PENDING') {
      const pendingGoals = await prisma.goal.findMany({
        where: { status: 'SUBMITTED', cycleId: cycle.id, updatedAt: { lte: thresholdDate } },
        include: { user: true },
      });
      for (const g of pendingGoals) {
        if (g.user.managerId) {
          const mgr = await prisma.user.findUnique({ where: { id: g.user.managerId } });
          if (mgr) {
            await prisma.notification.create({ data: { userId: mgr.id, type: 'ESCALATION_APPROVAL_PENDING', title: 'Goals Awaiting Approval', message: `${g.user.name}'s goal "${g.title}" has been pending your approval for ${rule.daysThreshold}+ days.` } });
            await sendEmail(mgr.email, `Action Required: Approve ${g.user.name}'s Goals`, `Dear ${mgr.name},\n\nGoals submitted by ${g.user.name} have been awaiting your approval for ${rule.daysThreshold}+ days.\n\nGoalForge`);
          }
        }
      }
    }

    if (rule.triggerType === 'CHECKIN_MISSING') {
      // Check which quarter is open
      const now = new Date();
      const quarters: Array<{ q: 'Q1' | 'Q2' | 'Q3' | 'Q4'; open: Date }> = [
        { q: 'Q1', open: new Date(cycle.q1Open) }, { q: 'Q2', open: new Date(cycle.q2Open) },
        { q: 'Q3', open: new Date(cycle.q3Open) }, { q: 'Q4', open: new Date(cycle.q4Open) },
      ];
      for (const { q, open } of quarters) {
        if (now < open) continue;
        const daysSince = Math.floor((now.getTime() - open.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < rule.daysThreshold) continue;

        const employees = await prisma.user.findMany({ where: { role: 'EMPLOYEE' } });
        for (const emp of employees) {
          const approvedGoals = await prisma.goal.findMany({ where: { userId: emp.id, cycleId: cycle.id, status: { in: ['APPROVED', 'LOCKED'] } } });
          if (approvedGoals.length === 0) continue;
          const checkedIn = await prisma.checkIn.count({ where: { userId: emp.id, quarter: q } });
          if (checkedIn === 0) {
            await prisma.notification.create({ data: { userId: emp.id, type: 'ESCALATION_CHECKIN_MISSING', title: `${q} Check-in Missing`, message: `Your ${q} check-in is overdue for ${cycle.name}.` } });
            await sendEmail(emp.email, `Reminder: ${q} Check-in Due`, `Dear ${emp.name},\n\nYour ${q} check-in is overdue. Please submit it immediately.\n\nGoalForge`);
          }
        }
      }
    }
  }
  console.log('[Escalation] Check complete.');
}

// Register cron — runs every 6 hours
export function startEscalationJob() {
  cron.schedule('0 */6 * * *', runEscalationCheck);
  console.log('[Escalation] Job registered (every 6h)');
}
