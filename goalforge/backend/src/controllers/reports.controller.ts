
import { Prisma, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { forbidden, unauthorized } from '../utils/errors';
import { currentUser } from './_helpers';
import { AuthUser } from '../types/auth';

function scopeGoals(user: AuthUser) {
  if (user.role === Role.ADMIN) {
    return {};
  }
  if (user.role === Role.MANAGER) {
    return { user: { managerId: user.id } };
  }
  throw forbidden('Report access is restricted to managers and admins');
}

function buildTeamQuery(user: AuthUser) {
  if (user.role === Role.ADMIN) {
    return {};
  }
  return { managerId: user.id };
}

function latestProgress(checkIns: Array<{ progressScore: number; createdAt: Date }>) {
  if (!checkIns.length) return 0;
  return checkIns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].progressScore;
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
      avgQualityScore: 0,
      avgProgressScore: 0,
      lockedGoals: 0,
      totalQualityScore: 0,
      totalProgressScore: 0
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

export const getCompletionReport = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can view completion reports');
  }

  const goals = await prisma.goal.findMany({
    where: { cycle: { isActive: true }, ...scopeGoals(user) },
    include: {
      user: { select: { id: true, name: true, department: true, managerId: true } },
      checkIns: { orderBy: { createdAt: 'desc' } }
    }
  });

  const goalRows = goals.map((goal) => ({
    goalId: goal.id,
    title: goal.title,
    status: goal.status,
    employee: goal.user.name,
    department: goal.user.department,
    locked: goal.status === 'LOCKED',
    latestProgress: latestProgress(goal.checkIns),
    checkIns: goal.checkIns.length,
    completionStatus: goal.status === 'LOCKED' || goal.status === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS'
  }));

  const departmentStats = Array.from(
    goalRows.reduce((acc, row) => {
      const current = acc.get(row.department) ?? { department: row.department, goals: 0, completed: 0, averageProgress: 0, totalProgress: 0 };
      current.goals += 1;
      if (row.completionStatus === 'COMPLETED') current.completed += 1;
      current.totalProgress += row.latestProgress;
      acc.set(row.department, current);
      return acc;
    }, new Map<string, any>()).values()
  ).map((entry: any) => ({
    department: entry.department,
    goals: entry.goals,
    completed: entry.completed,
    completionRate: entry.goals ? Number(((entry.completed / entry.goals) * 100).toFixed(2)) : 0,
    averageProgress: entry.goals ? Number((entry.totalProgress / entry.goals).toFixed(2)) : 0
  }));

  res.json({ goals: goalRows, departmentStats });
});

export const getManagerEffectivenessReport = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can view effectiveness reports');
  }

  const managers = await prisma.user.findMany({
    where: user.role === Role.ADMIN ? { role: Role.MANAGER } : { id: user.id, role: Role.MANAGER },
    select: { id: true, name: true, department: true }
  });

  const report = await Promise.all(
    managers.map(async (manager) => {
      const teamMembers = await prisma.user.findMany({ where: { managerId: manager.id }, select: { id: true } });
      const teamIds = teamMembers.map((member) => member.id);

      const goals = await prisma.goal.findMany({
        where: { userId: { in: teamIds }, cycle: { isActive: true } },
        include: { checkIns: { orderBy: { createdAt: 'desc' } } }
      });

      const totalGoals = goals.length;
      const lockedGoals = goals.filter((goal) => goal.status === 'LOCKED').length;
      const submittedGoals = goals.filter((goal) => goal.status === 'SUBMITTED' || goal.status === 'LOCKED' || goal.status === 'APPROVED').length;
      const averageProgress = totalGoals ? Number((goals.reduce((sum, goal) => sum + latestProgress(goal.checkIns), 0) / totalGoals).toFixed(2)) : 0;

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
