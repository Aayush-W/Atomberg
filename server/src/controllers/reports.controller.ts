import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { forbidden } from '../utils/errors';
import { currentUser } from './_helpers';
import { goalSummary } from '../services/ai.service';
import { buildSimplePdf, maskGoalContent } from '../services/reporting.service';
import { buildTeamSentimentSummary } from '../services/sentiment.service';

function scopeGoals(user: { role: Role; id: string; tenantId: string }) {
  if (user.role === Role.ADMIN) {
    return { tenantId: user.tenantId };
  }
  if (user.role === Role.MANAGER) {
    return { tenantId: user.tenantId, user: { managerId: user.id } };
  }
  throw forbidden('Report access is restricted to managers and admins');
}

function latestProgress(checkIns: Array<{ progressScore: number; createdAt: Date }>) {
  if (!checkIns.length) return 0;
  return [...checkIns].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].progressScore;
}

export const getAchievementReport = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can view achievement reports');
  }

  const goals = await prisma.goal.findMany({
    where: { cycle: { isActive: true }, ...scopeGoals(user) },
    include: {
      user: { select: { id: true, name: true, department: true, managerId: true } },
      checkIns: { orderBy: { createdAt: 'desc' } }
    }
  });

  const byUser = new Map<string, any>();
  goals.forEach((goal) => {
    const current = byUser.get(goal.user.id) ?? {
      userId: goal.user.id,
      name: goal.user.name,
      department: goal.user.department,
      goals: 0,
      totalQualityScore: 0,
      totalProgressScore: 0,
      lockedGoals: 0
    };

    current.goals += 1;
    if (typeof goal.qualityScore === 'number') {
      current.totalQualityScore += goal.qualityScore;
    }
    current.totalProgressScore += latestProgress(goal.checkIns);
    if (goal.status === 'LOCKED') current.lockedGoals += 1;
    byUser.set(goal.user.id, current);
  });

  const report = Array.from(byUser.values()).map((entry) => ({
    userId: entry.userId,
    name: entry.name,
    department: entry.department,
    goals: entry.goals,
    avgQualityScore: entry.goals ? Number((entry.totalQualityScore / entry.goals).toFixed(2)) : 0,
    avgProgressScore: entry.goals ? Number((entry.totalProgressScore / entry.goals).toFixed(2)) : 0,
    lockedGoals: entry.lockedGoals
  }));

  res.json({ report });
});

export const exportAchievementReport = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can export achievement reports');
  }

  const format = typeof req.query.format === 'string' ? req.query.format : 'csv';

  const goals = await prisma.goal.findMany({
    where: { cycle: { isActive: true }, ...scopeGoals(user) },
    include: {
      user: { select: { id: true, name: true, department: true, managerId: true } },
      checkIns: { orderBy: { createdAt: 'desc' } }
    }
  });

  const byUser = new Map<string, any>();
  goals.forEach((goal) => {
    const current = byUser.get(goal.user.id) ?? {
      userId: goal.user.id,
      name: goal.user.name,
      department: goal.user.department,
      goals: 0,
      totalQualityScore: 0,
      totalProgressScore: 0,
      lockedGoals: 0
    };
    current.goals += 1;
    if (typeof goal.qualityScore === 'number') current.totalQualityScore += goal.qualityScore;
    current.totalProgressScore += latestProgress(goal.checkIns);
    if (goal.status === 'LOCKED') current.lockedGoals += 1;
    byUser.set(goal.user.id, current);
  });

  const rows = Array.from(byUser.values()).map((entry) => ({
    Name: entry.name,
    Department: entry.department,
    'Total Goals': entry.goals,
    'Avg Quality Score': entry.goals ? (entry.totalQualityScore / entry.goals).toFixed(2) : '0',
    'Avg Progress Score (%)': entry.goals ? (entry.totalProgressScore / entry.goals).toFixed(2) : '0',
    'Locked Goals': entry.lockedGoals
  }));

  const headers = Object.keys(rows[0] ?? { Name: '', Department: '', 'Total Goals': '', 'Avg Quality Score': '', 'Avg Progress Score (%)': '', 'Locked Goals': '' });
  const delimiter = format === 'excel' ? '\t' : ',';
  const escape = (val: string | number) => {
    const str = String(val);
    if (delimiter === ',' && (str.includes(',') || str.includes('"') || str.includes('\n'))) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escape).join(delimiter),
    ...rows.map((row) => headers.map((h) => escape((row as any)[h] ?? '')).join(delimiter))
  ];
  const csvContent = csvLines.join('\n');

  if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename="achievement_report.xlsx"');
  } else {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="achievement_report.csv"');
  }
  res.send(csvContent);
});

export const getCompletionReport = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can view completion reports');
  }

  const employees = await prisma.user.findMany({
    where: {
      tenantId: user.tenantId,
      role: Role.EMPLOYEE,
      ...(user.role === Role.MANAGER ? { managerId: user.id } : {})
    },
    include: {
      manager: { select: { name: true } },
      goals: {
        where: { cycle: { isActive: true } },
        include: { checkIns: true }
      }
    }
  });

  const report = employees.map((employee) => {
    const goals = employee.goals;
    const submitted = goals.length > 0 && goals.some((goal) => goal.status !== 'DRAFT');
    const approved = goals.length > 0 && goals.every((goal) => ['APPROVED', 'LOCKED'].includes(goal.status));

    return {
      employeeName: employee.name,
      manager: employee.manager?.name ?? 'N/A',
      goalsSubmitted: submitted,
      goalsApproved: approved,
      q1Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q1')),
      q2Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q2')),
      q3Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q3')),
      q4Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q4'))
    };
  });

  res.json({ report });
});

export const getManagerEffectivenessReport = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can view effectiveness reports');
  }

  const managers = await prisma.user.findMany({
    where: user.role === Role.ADMIN ? { tenantId: user.tenantId, role: Role.MANAGER } : { tenantId: user.tenantId, id: user.id, role: Role.MANAGER },
    select: { id: true, name: true, department: true }
  });

  const report = await Promise.all(
    managers.map(async (manager) => {
      const teamMembers = await prisma.user.findMany({ where: { tenantId: user.tenantId, managerId: manager.id }, select: { id: true } });
      const teamIds = teamMembers.map((member) => member.id);

      const goals = await prisma.goal.findMany({
        where: { userId: { in: teamIds }, cycle: { isActive: true } },
        include: { checkIns: { orderBy: { createdAt: 'desc' } } }
      });

      const totalGoals = goals.length;
      const lockedGoals = goals.filter((goal) => goal.status === 'LOCKED').length;
      const submittedGoals = goals.filter((goal) => ['SUBMITTED', 'LOCKED', 'APPROVED'].includes(goal.status)).length;
      const averageProgress =
        totalGoals > 0 ? Number((goals.reduce((sum, goal) => sum + latestProgress(goal.checkIns), 0) / totalGoals).toFixed(2)) : 0;

      return {
        managerId: manager.id,
        managerName: manager.name,
        department: manager.department,
        teamSize: teamIds.length,
        totalGoals,
        lockedGoals,
        submittedGoals,
        approvalRate: submittedGoals ? Number(((lockedGoals / submittedGoals) * 100).toFixed(2)) : 0,
        averageProgress
      };
    })
  );

  res.json({ report });
});

export const getQoQTrendsReport = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can view QoQ trends');
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { goal: { cycle: { isActive: true }, ...scopeGoals(user) } },
    select: { quarter: true, progressScore: true }
  });

  const grouped = checkIns.reduce((acc, item) => {
    const bucket = acc.get(item.quarter) ?? { quarter: item.quarter, values: [] as number[] };
    bucket.values.push(item.progressScore);
    acc.set(item.quarter, bucket);
    return acc;
  }, new Map<string, { quarter: string; values: number[] }>());

  const trends = Array.from(grouped.values())
    .map((entry) => ({
      quarter: entry.quarter,
      averageProgress: entry.values.length ? Number((entry.values.reduce((a, b) => a + b, 0) / entry.values.length).toFixed(2)) : 0,
      sampleSize: entry.values.length
    }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  res.json({ trends });
});

export const getLeaderboards = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can view leaderboards');
  }

  const employees = await prisma.user.findMany({
    where: {
      tenantId: user.tenantId,
      role: Role.EMPLOYEE,
      ...(user.role === Role.MANAGER ? { managerId: user.id } : {})
    },
    include: {
      goals: {
        where: { cycle: { isActive: true } },
        include: { checkIns: true, kudos: true }
      }
    }
  });

  const sentiment = await buildTeamSentimentSummary(user.tenantId, user.role === Role.MANAGER ? user.id : undefined);

  const leaderboard = employees.reduce<Record<string, { department: string; members: number; onTime: number; progress: number; kudos: number; healthy: number }>>(
    (acc, employee) => {
      const bucket = acc[employee.department] ?? {
        department: employee.department,
        members: 0,
        onTime: 0,
        progress: 0,
        kudos: 0,
        healthy: 0
      };

      bucket.members += 1;
      const checkIns = employee.goals.flatMap((goal) => goal.checkIns);
      const goalProgress = employee.goals.length
        ? employee.goals.reduce((sum, goal) => sum + latestProgress(goal.checkIns), 0) / employee.goals.length
        : 0;
      bucket.progress += goalProgress;
      bucket.kudos += employee.goals.reduce((sum, goal) => sum + goal.kudos.length, 0);
      bucket.onTime += checkIns.length > 0 ? 1 : 0;
      bucket.healthy += checkIns.some((checkIn) => (checkIn.sentiment ?? 0) >= 0.1) ? 1 : 0;
      acc[employee.department] = bucket;
      return acc;
    },
    {}
  );

  const rows = Object.values(leaderboard)
    .map((row) => ({
      department: row.department,
      onTimeCompliance: row.members ? Number(((row.onTime / row.members) * 100).toFixed(1)) : 0,
      averageProgress: row.members ? Number((row.progress / row.members).toFixed(1)) : 0,
      kudosEarned: row.kudos,
      healthySentimentRate: row.members ? Number(((row.healthy / row.members) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.onTimeCompliance - a.onTimeCompliance);

  res.json({
    leaderboard: rows,
    engagementScore: sentiment.engagementScore,
    alertFlags: sentiment.alertFlags
  });
});

export const getPerformanceDossier = asyncHandler(async (req: Request<{ userId: string }>, res: Response) => {
  const user = currentUser(req);
  const employee = await prisma.user.findUnique({
    where: { id: req.params.userId },
    include: {
      manager: { select: { name: true } },
      goals: {
        where: { cycle: { isActive: true } },
        include: {
          checkIns: { orderBy: { createdAt: 'asc' } },
          kudos: {
            include: {
              sender: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!employee) {
    throw forbidden('Employee not found');
  }
  if (employee.tenantId !== user.tenantId) {
    throw forbidden('Employee is outside your tenant');
  }

  const canView =
    user.role === Role.ADMIN ||
    user.id === employee.id ||
    (user.role === Role.MANAGER && employee.managerId === user.id);
  if (!canView) {
    throw forbidden('You do not have access to this dossier');
  }

  const summary = await goalSummary({
    employee: { id: employee.id, name: employee.name, department: employee.department, jobTitle: employee.jobTitle },
    goals: employee.goals
  });

  const goalLines = employee.goals.flatMap((goal, index) => {
    const visible = maskGoalContent(goal, user);
    const latest = goal.checkIns.at(-1);
    return [
      `${index + 1}. ${visible.title}`,
      `   Area: ${goal.thrustArea} | Weight: ${goal.weightage}% | Sensitivity: ${goal.sensitivity}`,
      `   Description: ${visible.description}`,
      `   Latest progress: ${latest?.progressScore ?? 0}% | Manager note: ${latest?.managerComment ?? goal.managerComment ?? 'N/A'}`,
      `   Kudos: ${goal.kudos.map((kudos) => `${kudos.sender.name} (${kudos.badgeType})`).join(', ') || 'None'}`
    ];
  });

  const pdf = buildSimplePdf([
    'GoalForge Performance Dossier',
    `Employee: ${employee.name}`,
    `Department: ${employee.department}`,
    `Job Title: ${employee.jobTitle ?? 'N/A'}`,
    `Manager: ${employee.manager?.name ?? 'N/A'}`,
    '',
    'AI Summary:',
    summary.summary,
    '',
    'Goals:',
    ...goalLines
  ]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="goalforge-dossier-${employee.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
  res.send(pdf);
});
