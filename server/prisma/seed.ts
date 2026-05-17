import {
  AuthProvider,
  CheckInStatus,
  GoalConflictSeverity,
  GoalConflictStatus,
  GoalSensitivity,
  GoalStatus,
  KudosBadgeType,
  NotificationChannel,
  PrismaClient,
  Quarter,
  Role,
  UoMType
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.escalationEvent.deleteMany();
  await prisma.goalConflictAlert.deleteMany();
  await prisma.kudos.deleteMany();
  await prisma.approvalDelegation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.goalDependency.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.escalationRule.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const managerPassword = await bcrypt.hash('Manager@123', 10);
  const employeePassword = await bcrypt.hash('Employee@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@goalforge.com',
      password: adminPassword,
      role: Role.ADMIN,
      department: 'Executive',
      jobTitle: 'HR Operations Director',
      authProvider: AuthProvider.LOCAL
    }
  });

  const managers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Manager One',
        email: 'manager1@goalforge.com',
        password: managerPassword,
        role: Role.MANAGER,
        department: 'Innovation',
        jobTitle: 'Engineering Manager',
        managerId: admin.id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Manager Two',
        email: 'manager2@goalforge.com',
        password: managerPassword,
        role: Role.MANAGER,
        department: 'Revenue Growth',
        jobTitle: 'Revenue Operations Manager',
        managerId: admin.id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Manager Three',
        email: 'manager3@goalforge.com',
        password: managerPassword,
        role: Role.MANAGER,
        department: 'Operational Excellence',
        jobTitle: 'Program Delivery Manager',
        managerId: admin.id
      }
    })
  ]);

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Alice Kim',
        email: 'alice@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Innovation',
        jobTitle: 'Senior Product Engineer',
        managerId: managers[0].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Ben Carter',
        email: 'ben@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Innovation',
        jobTitle: 'Platform Engineer',
        managerId: managers[0].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Carmen Diaz',
        email: 'carmen@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Innovation',
        jobTitle: 'UX Research Analyst',
        managerId: managers[0].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Daniel Lee',
        email: 'daniel@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Revenue Growth',
        jobTitle: 'Account Executive',
        managerId: managers[1].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Erika Patel',
        email: 'erika@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Revenue Growth',
        jobTitle: 'Customer Success Lead',
        managerId: managers[1].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Felix Wang',
        email: 'felix@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Revenue Growth',
        jobTitle: 'Sales Operations Analyst',
        managerId: managers[1].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Gia Shah',
        email: 'gia@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Operational Excellence',
        jobTitle: 'Business Process Specialist',
        managerId: managers[2].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Hugo Martinez',
        email: 'hugo@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Operational Excellence',
        jobTitle: 'Delivery Operations Analyst',
        managerId: managers[2].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Isha Rao',
        email: 'isha@goalforge.com',
        password: employeePassword,
        role: Role.EMPLOYEE,
        department: 'Operational Excellence',
        jobTitle: 'Automation Engineer',
        managerId: managers[2].id,
        authProvider: AuthProvider.MICROSOFT_DEMO,
        microsoftEntraId: 'demo-entra-isha',
        microsoftTenantId: 'demo-tenant'
      }
    })
  ]);

  const cycle = await prisma.cycle.create({
    data: {
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01T00:00:00Z'),
      endDate: new Date('2027-03-31T23:59:59Z'),
      goalSettingOpen: new Date('2026-04-01T00:00:00Z'),
      q1Open: new Date('2026-06-15T00:00:00Z'),
      q2Open: new Date('2026-09-15T00:00:00Z'),
      q3Open: new Date('2026-12-15T00:00:00Z'),
      q4Open: new Date('2027-03-01T00:00:00Z'),
      bypassWindow: false
    }
  });

  const aliceGoals = await Promise.all([
    prisma.goal.create({
      data: {
        userId: employees[0].id,
        cycleId: cycle.id,
        thrustArea: 'Innovation',
        title: 'Launch two prototype demos for the connected fan roadmap',
        description:
          'Build and release two working prototypes to validate the connected fan concept with pilot users and executive stakeholders.',
        uomType: UoMType.MIN,
        target: 2,
        weightage: 45,
        status: GoalStatus.SUBMITTED,
        sensitivity: GoalSensitivity.NORMAL,
        qualityScore: 87.5,
        qualityFeedback: { specific: 5, measurable: 4, achievable: 4, relevant: 5, timeBound: 4 }
      }
    }),
    prisma.goal.create({
      data: {
        userId: employees[0].id,
        cycleId: cycle.id,
        thrustArea: 'Operational Excellence',
        title: 'Reduce cloud inference costs for prototype telemetry by 50%',
        description:
          'Optimize telemetry ingestion and inference scheduling to halve monthly cloud spend without reducing product insight coverage.',
        uomType: UoMType.MAX,
        target: 50,
        weightage: 55,
        status: GoalStatus.SUBMITTED,
        sensitivity: GoalSensitivity.TECHNICAL,
        qualityScore: 82.0,
        qualityFeedback: { specific: 4, measurable: 5, achievable: 4, relevant: 4, timeBound: 4 }
      }
    })
  ]);

  const goalDaniel = await prisma.goal.create({
    data: {
      userId: employees[3].id,
      cycleId: cycle.id,
      thrustArea: 'Revenue Growth',
      title: 'Close $1.2M of new pipeline in Q2',
      description:
        'Drive qualified opportunities and close new business worth at least 1.2M by the end of Q2.',
      uomType: UoMType.MIN,
      target: 1200000,
      weightage: 50,
      status: GoalStatus.LOCKED,
      sensitivity: GoalSensitivity.FINANCIAL,
      qualityScore: 92.0,
      qualityFeedback: { specific: 5, measurable: 5, achievable: 4, relevant: 5, timeBound: 5 },
      lockedAt: new Date('2026-04-20T12:00:00Z')
    }
  });

  const goalErika = await prisma.goal.create({
    data: {
      userId: employees[4].id,
      cycleId: cycle.id,
      thrustArea: 'Revenue Growth',
      title: 'Increase customer renewal rate by 10%',
      description:
        'Implement retention tactics and executive check-ins to achieve a 10% increase in renewals by year end.',
      uomType: UoMType.MIN,
      target: 10,
      weightage: 40,
      status: GoalStatus.APPROVED,
      sensitivity: GoalSensitivity.NORMAL,
      qualityScore: 84.0,
      qualityFeedback: { specific: 4, measurable: 4, achievable: 4, relevant: 5, timeBound: 4 },
      lockedAt: new Date('2026-05-01T09:00:00Z')
    }
  });

  const goalHugo = await prisma.goal.create({
    data: {
      userId: employees[7].id,
      cycleId: cycle.id,
      thrustArea: 'Operational Excellence',
      title: 'Deploy automated team workload dashboard',
      description:
        'Roll out an automated dashboard that tracks team workload, cycle times, and capacity utilization across delivery squads.',
      uomType: UoMType.TIMELINE,
      target: 1,
      targetDate: new Date('2026-11-15T00:00:00Z'),
      weightage: 60,
      status: GoalStatus.APPROVED,
      sensitivity: GoalSensitivity.NORMAL,
      qualityScore: 88.0,
      qualityFeedback: { specific: 5, measurable: 4, achievable: 5, relevant: 4, timeBound: 5 },
      lockedAt: new Date('2026-05-10T15:30:00Z')
    }
  });

  const sharedPrimary = await prisma.goal.create({
    data: {
      userId: employees[1].id,
      cycleId: cycle.id,
      thrustArea: 'Innovation',
      title: 'Standardize quarterly innovation reviews',
      description:
        'Create and deliver a templated review process for innovation ideas every quarter, including scoring and action tracking.',
      uomType: UoMType.ZERO,
      target: 0,
      weightage: 40,
      status: GoalStatus.APPROVED,
      sensitivity: GoalSensitivity.NORMAL,
      qualityScore: 90.0,
      qualityFeedback: { specific: 5, measurable: 5, achievable: 4, relevant: 5, timeBound: 5 },
      lockedAt: new Date('2026-04-28T10:00:00Z')
    }
  });

  const sharedChild = await prisma.goal.create({
    data: {
      userId: employees[2].id,
      cycleId: cycle.id,
      thrustArea: sharedPrimary.thrustArea,
      title: sharedPrimary.title,
      description: sharedPrimary.description,
      uomType: sharedPrimary.uomType,
      target: sharedPrimary.target,
      weightage: 40,
      status: GoalStatus.APPROVED,
      isShared: true,
      parentGoalId: sharedPrimary.id,
      sensitivity: GoalSensitivity.NORMAL,
      qualityScore: 90.0,
      qualityFeedback: sharedPrimary.qualityFeedback as object,
      lockedAt: new Date('2026-04-28T10:00:00Z')
    }
  });

  await prisma.goal.update({
    where: { id: sharedPrimary.id },
    data: { sharedWith: { connect: { id: sharedChild.id } } }
  });

  await prisma.goalConflictAlert.create({
    data: {
      goalAId: aliceGoals[0].id,
      goalBId: aliceGoals[1].id,
      cycleId: cycle.id,
      department: 'Innovation',
      severity: GoalConflictSeverity.HIGH,
      reason:
        'Prototype expansion depends on more telemetry and compute, while the cost-reduction goal aggressively constrains the same platform resources.',
      status: GoalConflictStatus.OPEN
    }
  });

  await prisma.checkIn.createMany({
    data: [
      {
        goalId: goalDaniel.id,
        userId: employees[3].id,
        quarter: Quarter.Q1,
        actualValue: 620000,
        status: CheckInStatus.ON_TRACK,
        progressScore: 52,
        employeeNote: 'Pipeline conversion improved after two enterprise demos.',
        managerComment: 'Strong pace so far. Keep multithreading the late-stage deals.',
        managerCheckedAt: new Date('2026-07-01T15:00:00Z'),
        sentiment: 0.46
      },
      {
        goalId: goalErika.id,
        userId: employees[4].id,
        quarter: Quarter.Q1,
        actualValue: 4,
        status: CheckInStatus.ON_TRACK,
        progressScore: 40,
        employeeNote: 'Renewal risk is concentrated in two legacy accounts, but executive coverage is helping.',
        managerComment: 'Good recovery plan. Tighten weekly follow-up on the at-risk accounts.',
        managerCheckedAt: new Date('2026-07-02T09:00:00Z'),
        sentiment: 0.28
      },
      {
        goalId: goalHugo.id,
        userId: employees[7].id,
        quarter: Quarter.Q1,
        actualValue: 1,
        completionDate: new Date('2026-07-08T00:00:00Z'),
        status: CheckInStatus.COMPLETED,
        progressScore: 100,
        employeeNote: 'Dashboard shipped to all leads and auto-refresh is stable.',
        managerComment: 'Excellent execution and a clean rollout to the full team.',
        managerCheckedAt: new Date('2026-07-10T10:00:00Z'),
        sentiment: 0.68
      },
      {
        goalId: sharedPrimary.id,
        userId: employees[1].id,
        quarter: Quarter.Q1,
        actualValue: 0,
        status: CheckInStatus.COMPLETED,
        progressScore: 100,
        employeeNote: 'Review template signed off by leadership and in use.',
        managerComment: 'This became a strong template for the rest of the org.',
        managerCheckedAt: new Date('2026-07-12T10:00:00Z'),
        sentiment: 0.61
      },
      {
        goalId: sharedChild.id,
        userId: employees[2].id,
        quarter: Quarter.Q1,
        actualValue: 0,
        status: CheckInStatus.COMPLETED,
        progressScore: 100,
        employeeNote: 'Inherited shared review process and piloted it with UX studies.',
        managerComment: 'Helpful adaptation for research workflows.',
        managerCheckedAt: new Date('2026-07-13T10:00:00Z'),
        sentiment: 0.54
      }
    ]
  });

  const [goalSubmissionRule, approvalRule, checkinRule] = await Promise.all([
    prisma.escalationRule.create({
      data: {
        name: 'Goal submission overdue',
        triggerType: 'GOAL_NOT_SUBMITTED',
        daysThreshold: 7,
        escalationChain: [{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }]
      }
    }),
    prisma.escalationRule.create({
      data: {
        name: 'Approval pending escalation',
        triggerType: 'APPROVAL_PENDING',
        daysThreshold: 3,
        escalationChain: [{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }]
      }
    }),
    prisma.escalationRule.create({
      data: {
        name: 'Missing quarterly check-in',
        triggerType: 'CHECKIN_MISSING',
        daysThreshold: 5,
        escalationChain: [{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }]
      }
    })
  ]);

  await prisma.approvalDelegation.create({
    data: {
      delegatorManagerId: managers[0].id,
      delegateManagerId: managers[2].id,
      startsAt: new Date('2026-05-15T00:00:00Z'),
      endsAt: new Date('2026-05-25T23:59:59Z'),
      reason: 'Annual leave overlap for Q1 goal review approvals',
      isActive: true
    }
  });

  await prisma.kudos.createMany({
    data: [
      {
        senderId: employees[2].id,
        receiverId: employees[1].id,
        goalId: sharedPrimary.id,
        badgeType: KudosBadgeType.COLLABORATOR,
        note: 'Thanks for packaging the review playbook so clearly for the whole innovation team.'
      },
      {
        senderId: employees[7].id,
        receiverId: employees[4].id,
        goalId: goalErika.id,
        badgeType: KudosBadgeType.CUSTOMER_CHAMPION,
        note: 'Your renewal recovery plan helped us align service teams much faster.'
      }
    ]
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: employees[0].id,
        type: 'GOAL_REMINDER',
        channel: NotificationChannel.IN_APP,
        title: 'Goal sheet ready for manager review',
        message: 'Your Q1 goal sheet has been submitted and is awaiting manager approval.'
      },
      {
        userId: managers[0].id,
        type: 'APPROVAL_PENDING',
        channel: NotificationChannel.TEAMS,
        title: 'Alice Kim submitted goals for approval',
        message: 'Review Alice’s goal sheet in GoalForge or approve directly from the Teams preview.'
      }
    ]
  });

  await prisma.escalationEvent.create({
    data: {
      uniqueKey: `${checkinRule.id}:${employees[5].id}:Q1:NUDGE`,
      ruleId: checkinRule.id,
      recipientUserId: employees[5].id,
      cycleId: cycle.id,
      quarter: Quarter.Q1,
      triggerType: checkinRule.triggerType,
      phase: 'NUDGE',
      message: 'Reminder sent for missing Q1 check-in.',
      metadata: { daysRemaining: 3 }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        goalId: aliceGoals[0].id,
        userId: employees[0].id,
        action: 'GOAL_SUBMITTED',
        field: 'status',
        oldValue: GoalStatus.DRAFT,
        newValue: GoalStatus.SUBMITTED
      },
      {
        goalId: goalDaniel.id,
        userId: managers[1].id,
        action: 'GOAL_APPROVED_FROM_MANAGER_FLOW',
        field: 'status',
        oldValue: GoalStatus.SUBMITTED,
        newValue: GoalStatus.LOCKED
      },
      {
        goalId: sharedPrimary.id,
        userId: employees[2].id,
        action: 'KUDOS_RECEIVED',
        field: 'badgeType',
        oldValue: null,
        newValue: KudosBadgeType.COLLABORATOR
      }
    ]
  });

  console.log(
    `Seed completed successfully with rules ${goalSubmissionRule.name}, ${approvalRule.name}, and ${checkinRule.name}.`
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
