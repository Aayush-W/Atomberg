"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.webhookDelivery.deleteMany();
    await prisma.webhookEndpoint.deleteMany();
    await prisma.domainEvent.deleteMany();
    await prisma.apiIdempotencyKey.deleteMany();
    await prisma.featureFlag.deleteMany();
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
    await prisma.tenant.deleteMany();
    const tenant = await prisma.tenant.create({
        data: {
            name: 'GoalForge Demo Org',
            slug: 'demo-tenant',
            webhookSecret: 'goalforge-demo-secret',
            branding: {
                primaryColor: '#5b6ef3',
                accentColor: '#22c55e'
            }
        }
    });
    const adminPassword = await bcrypt_1.default.hash('Admin@123', 10);
    const managerPassword = await bcrypt_1.default.hash('Manager@123', 10);
    const employeePassword = await bcrypt_1.default.hash('Employee@123', 10);
    const admin = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            name: 'Admin User',
            email: 'admin@goalforge.com',
            password: adminPassword,
            role: client_1.Role.ADMIN,
            department: 'Executive',
            jobTitle: 'HR Operations Director',
            authProvider: client_1.AuthProvider.LOCAL
        }
    });
    const managers = await Promise.all([
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Manager One',
                email: 'manager1@goalforge.com',
                password: managerPassword,
                role: client_1.Role.MANAGER,
                department: 'Innovation',
                jobTitle: 'Engineering Manager',
                managerId: admin.id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Manager Two',
                email: 'manager2@goalforge.com',
                password: managerPassword,
                role: client_1.Role.MANAGER,
                department: 'Revenue Growth',
                jobTitle: 'Revenue Operations Manager',
                managerId: admin.id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Manager Three',
                email: 'manager3@goalforge.com',
                password: managerPassword,
                role: client_1.Role.MANAGER,
                department: 'Operational Excellence',
                jobTitle: 'Program Delivery Manager',
                managerId: admin.id
            }
        })
    ]);
    const employees = await Promise.all([
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Alice Kim',
                email: 'alice@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Innovation',
                jobTitle: 'Senior Product Engineer',
                managerId: managers[0].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Ben Carter',
                email: 'ben@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Innovation',
                jobTitle: 'Platform Engineer',
                managerId: managers[0].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Carmen Diaz',
                email: 'carmen@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Innovation',
                jobTitle: 'UX Research Analyst',
                managerId: managers[0].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Daniel Lee',
                email: 'daniel@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Revenue Growth',
                jobTitle: 'Account Executive',
                managerId: managers[1].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Erika Patel',
                email: 'erika@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Revenue Growth',
                jobTitle: 'Customer Success Lead',
                managerId: managers[1].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Felix Wang',
                email: 'felix@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Revenue Growth',
                jobTitle: 'Sales Operations Analyst',
                managerId: managers[1].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Gia Shah',
                email: 'gia@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Operational Excellence',
                jobTitle: 'Business Process Specialist',
                managerId: managers[2].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Hugo Martinez',
                email: 'hugo@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Operational Excellence',
                jobTitle: 'Delivery Operations Analyst',
                managerId: managers[2].id
            }
        }),
        prisma.user.create({
            data: {
                tenantId: tenant.id,
                name: 'Isha Rao',
                email: 'isha@goalforge.com',
                password: employeePassword,
                role: client_1.Role.EMPLOYEE,
                department: 'Operational Excellence',
                jobTitle: 'Automation Engineer',
                managerId: managers[2].id,
                authProvider: client_1.AuthProvider.MICROSOFT_DEMO,
                microsoftEntraId: 'demo-entra-isha',
                microsoftTenantId: 'demo-tenant'
            }
        })
    ]);
    const cycle = await prisma.cycle.create({
        data: {
            tenantId: tenant.id,
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
                tenantId: tenant.id,
                userId: employees[0].id,
                cycleId: cycle.id,
                thrustArea: 'Innovation',
                title: 'Launch two prototype demos for the connected fan roadmap',
                description: 'Build and release two working prototypes to validate the connected fan concept with pilot users and executive stakeholders.',
                uomType: client_1.UoMType.MIN,
                target: 2,
                weightage: 45,
                status: client_1.GoalStatus.SUBMITTED,
                sensitivity: client_1.GoalSensitivity.NORMAL,
                qualityScore: 87.5,
                qualityFeedback: { specific: 5, measurable: 4, achievable: 4, relevant: 5, timeBound: 4 }
            }
        }),
        prisma.goal.create({
            data: {
                tenantId: tenant.id,
                userId: employees[0].id,
                cycleId: cycle.id,
                thrustArea: 'Operational Excellence',
                title: 'Reduce cloud inference costs for prototype telemetry by 50%',
                description: 'Optimize telemetry ingestion and inference scheduling to halve monthly cloud spend without reducing product insight coverage.',
                uomType: client_1.UoMType.MAX,
                target: 50,
                weightage: 55,
                status: client_1.GoalStatus.SUBMITTED,
                sensitivity: client_1.GoalSensitivity.TECHNICAL,
                qualityScore: 82.0,
                qualityFeedback: { specific: 4, measurable: 5, achievable: 4, relevant: 4, timeBound: 4 }
            }
        })
    ]);
    const goalDaniel = await prisma.goal.create({
        data: {
            tenantId: tenant.id,
            userId: employees[3].id,
            cycleId: cycle.id,
            thrustArea: 'Revenue Growth',
            title: 'Close $1.2M of new pipeline in Q2',
            description: 'Drive qualified opportunities and close new business worth at least 1.2M by the end of Q2.',
            uomType: client_1.UoMType.MIN,
            target: 1200000,
            weightage: 50,
            status: client_1.GoalStatus.LOCKED,
            sensitivity: client_1.GoalSensitivity.FINANCIAL,
            qualityScore: 92.0,
            qualityFeedback: { specific: 5, measurable: 5, achievable: 4, relevant: 5, timeBound: 5 },
            lockedAt: new Date('2026-04-20T12:00:00Z')
        }
    });
    const goalErika = await prisma.goal.create({
        data: {
            tenantId: tenant.id,
            userId: employees[4].id,
            cycleId: cycle.id,
            thrustArea: 'Revenue Growth',
            title: 'Increase customer renewal rate by 10%',
            description: 'Implement retention tactics and executive check-ins to achieve a 10% increase in renewals by year end.',
            uomType: client_1.UoMType.MIN,
            target: 10,
            weightage: 40,
            status: client_1.GoalStatus.APPROVED,
            sensitivity: client_1.GoalSensitivity.NORMAL,
            qualityScore: 84.0,
            qualityFeedback: { specific: 4, measurable: 4, achievable: 4, relevant: 5, timeBound: 4 },
            lockedAt: new Date('2026-05-01T09:00:00Z')
        }
    });
    const goalHugo = await prisma.goal.create({
        data: {
            tenantId: tenant.id,
            userId: employees[7].id,
            cycleId: cycle.id,
            thrustArea: 'Operational Excellence',
            title: 'Deploy automated team workload dashboard',
            description: 'Roll out an automated dashboard that tracks team workload, cycle times, and capacity utilization across delivery squads.',
            uomType: client_1.UoMType.TIMELINE,
            target: 1,
            targetDate: new Date('2026-11-15T00:00:00Z'),
            weightage: 60,
            status: client_1.GoalStatus.APPROVED,
            sensitivity: client_1.GoalSensitivity.NORMAL,
            qualityScore: 88.0,
            qualityFeedback: { specific: 5, measurable: 4, achievable: 5, relevant: 4, timeBound: 5 },
            lockedAt: new Date('2026-05-10T15:30:00Z')
        }
    });
    const sharedPrimary = await prisma.goal.create({
        data: {
            tenantId: tenant.id,
            userId: employees[1].id,
            cycleId: cycle.id,
            thrustArea: 'Innovation',
            title: 'Standardize quarterly innovation reviews',
            description: 'Create and deliver a templated review process for innovation ideas every quarter, including scoring and action tracking.',
            uomType: client_1.UoMType.ZERO,
            target: 0,
            weightage: 40,
            status: client_1.GoalStatus.APPROVED,
            sensitivity: client_1.GoalSensitivity.NORMAL,
            qualityScore: 90.0,
            qualityFeedback: { specific: 5, measurable: 5, achievable: 4, relevant: 5, timeBound: 5 },
            lockedAt: new Date('2026-04-28T10:00:00Z')
        }
    });
    const sharedChild = await prisma.goal.create({
        data: {
            tenantId: tenant.id,
            userId: employees[2].id,
            cycleId: cycle.id,
            thrustArea: sharedPrimary.thrustArea,
            title: sharedPrimary.title,
            description: sharedPrimary.description,
            uomType: sharedPrimary.uomType,
            target: sharedPrimary.target,
            weightage: 40,
            status: client_1.GoalStatus.APPROVED,
            isShared: true,
            parentGoalId: sharedPrimary.id,
            sensitivity: client_1.GoalSensitivity.NORMAL,
            qualityScore: 90.0,
            qualityFeedback: sharedPrimary.qualityFeedback,
            lockedAt: new Date('2026-04-28T10:00:00Z')
        }
    });
    await prisma.goal.update({
        where: { id: sharedPrimary.id },
        data: { sharedWith: { connect: { id: sharedChild.id } } }
    });
    await prisma.goalConflictAlert.create({
        data: {
            tenantId: tenant.id,
            goalAId: aliceGoals[0].id,
            goalBId: aliceGoals[1].id,
            cycleId: cycle.id,
            department: 'Innovation',
            severity: client_1.GoalConflictSeverity.HIGH,
            reason: 'Prototype expansion depends on more telemetry and compute, while the cost-reduction goal aggressively constrains the same platform resources.',
            status: client_1.GoalConflictStatus.OPEN
        }
    });
    await prisma.checkIn.createMany({
        data: [
            {
                tenantId: tenant.id,
                goalId: goalDaniel.id,
                userId: employees[3].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 620000,
                status: client_1.CheckInStatus.ON_TRACK,
                progressScore: 52,
                employeeNote: 'Pipeline conversion improved after two enterprise demos.',
                managerComment: 'Strong pace so far. Keep multithreading the late-stage deals.',
                managerCheckedAt: new Date('2026-07-01T15:00:00Z'),
                sentiment: 0.46
            },
            {
                tenantId: tenant.id,
                goalId: goalErika.id,
                userId: employees[4].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 4,
                status: client_1.CheckInStatus.ON_TRACK,
                progressScore: 40,
                employeeNote: 'Renewal risk is concentrated in two legacy accounts, but executive coverage is helping.',
                managerComment: 'Good recovery plan. Tighten weekly follow-up on the at-risk accounts.',
                managerCheckedAt: new Date('2026-07-02T09:00:00Z'),
                sentiment: 0.28
            },
            {
                tenantId: tenant.id,
                goalId: goalHugo.id,
                userId: employees[7].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 1,
                completionDate: new Date('2026-07-08T00:00:00Z'),
                status: client_1.CheckInStatus.COMPLETED,
                progressScore: 100,
                employeeNote: 'Dashboard shipped to all leads and auto-refresh is stable.',
                managerComment: 'Excellent execution and a clean rollout to the full team.',
                managerCheckedAt: new Date('2026-07-10T10:00:00Z'),
                sentiment: 0.68
            },
            {
                tenantId: tenant.id,
                goalId: sharedPrimary.id,
                userId: employees[1].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 0,
                status: client_1.CheckInStatus.COMPLETED,
                progressScore: 100,
                employeeNote: 'Review template signed off by leadership and in use.',
                managerComment: 'This became a strong template for the rest of the org.',
                managerCheckedAt: new Date('2026-07-12T10:00:00Z'),
                sentiment: 0.61
            },
            {
                tenantId: tenant.id,
                goalId: sharedChild.id,
                userId: employees[2].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 0,
                status: client_1.CheckInStatus.COMPLETED,
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
                tenantId: tenant.id,
                name: 'Goal submission overdue',
                triggerType: 'GOAL_NOT_SUBMITTED',
                daysThreshold: 7,
                escalationChain: [{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }]
            }
        }),
        prisma.escalationRule.create({
            data: {
                tenantId: tenant.id,
                name: 'Approval pending escalation',
                triggerType: 'APPROVAL_PENDING',
                daysThreshold: 3,
                escalationChain: [{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }]
            }
        }),
        prisma.escalationRule.create({
            data: {
                tenantId: tenant.id,
                name: 'Missing quarterly check-in',
                triggerType: 'CHECKIN_MISSING',
                daysThreshold: 5,
                escalationChain: [{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }]
            }
        })
    ]);
    await prisma.approvalDelegation.create({
        data: {
            tenantId: tenant.id,
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
                tenantId: tenant.id,
                senderId: employees[2].id,
                receiverId: employees[1].id,
                goalId: sharedPrimary.id,
                badgeType: client_1.KudosBadgeType.COLLABORATOR,
                note: 'Thanks for packaging the review playbook so clearly for the whole innovation team.'
            },
            {
                tenantId: tenant.id,
                senderId: employees[7].id,
                receiverId: employees[4].id,
                goalId: goalErika.id,
                badgeType: client_1.KudosBadgeType.CUSTOMER_CHAMPION,
                note: 'Your renewal recovery plan helped us align service teams much faster.'
            }
        ]
    });
    await prisma.notification.createMany({
        data: [
            {
                tenantId: tenant.id,
                userId: employees[0].id,
                type: 'GOAL_REMINDER',
                channel: client_1.NotificationChannel.IN_APP,
                title: 'Goal sheet ready for manager review',
                message: 'Your Q1 goal sheet has been submitted and is awaiting manager approval.'
            },
            {
                tenantId: tenant.id,
                userId: managers[0].id,
                type: 'APPROVAL_PENDING',
                channel: client_1.NotificationChannel.TEAMS,
                title: 'Alice Kim submitted goals for approval',
                message: 'Review Alice’s goal sheet in GoalForge or approve directly from the Teams preview.'
            }
        ]
    });
    await prisma.escalationEvent.create({
        data: {
            tenantId: tenant.id,
            uniqueKey: `${checkinRule.id}:${employees[5].id}:Q1:NUDGE`,
            ruleId: checkinRule.id,
            recipientUserId: employees[5].id,
            cycleId: cycle.id,
            quarter: client_1.Quarter.Q1,
            triggerType: checkinRule.triggerType,
            phase: 'NUDGE',
            message: 'Reminder sent for missing Q1 check-in.',
            metadata: { daysRemaining: 3 }
        }
    });
    await prisma.auditLog.createMany({
        data: [
            {
                tenantId: tenant.id,
                goalId: aliceGoals[0].id,
                userId: employees[0].id,
                action: 'GOAL_SUBMITTED',
                field: 'status',
                oldValue: client_1.GoalStatus.DRAFT,
                newValue: client_1.GoalStatus.SUBMITTED
            },
            {
                tenantId: tenant.id,
                goalId: goalDaniel.id,
                userId: managers[1].id,
                action: 'GOAL_APPROVED_FROM_MANAGER_FLOW',
                field: 'status',
                oldValue: client_1.GoalStatus.SUBMITTED,
                newValue: client_1.GoalStatus.LOCKED
            },
            {
                tenantId: tenant.id,
                goalId: sharedPrimary.id,
                userId: employees[2].id,
                action: 'KUDOS_RECEIVED',
                field: 'badgeType',
                oldValue: null,
                newValue: client_1.KudosBadgeType.COLLABORATOR
            }
        ]
    });
    await prisma.featureFlag.createMany({
        data: [
            {
                tenantId: tenant.id,
                key: 'outbound-webhooks',
                description: 'Controls outbound domain-event webhook fan-out',
                enabled: true,
                metadata: { rollout: 'global' }
            },
            {
                tenantId: tenant.id,
                key: 'what-if-simulator',
                description: 'Controls manager planning simulator',
                enabled: true,
                metadata: { rollout: 'manager-admin' }
            },
            {
                tenantId: tenant.id,
                key: 'calibration-copilot',
                description: 'Controls calibration intelligence surfaces',
                enabled: true,
                metadata: { rollout: 'manager-admin' }
            },
            {
                tenantId: tenant.id,
                key: 'narrative-intelligence',
                description: 'Controls narrative team intelligence summaries',
                enabled: true,
                metadata: { rollout: 'manager-admin' }
            }
        ]
    });
    await prisma.webhookEndpoint.create({
        data: {
            tenantId: tenant.id,
            name: 'Demo Workday Connector',
            url: 'https://example.com/webhooks/goalforge',
            secret: 'demo-webhook-secret',
            subscribedEvents: ['goal.created', 'goal.updated', 'checkin.updated', 'review.generated', 'risk.detected'],
            isActive: false,
            createdByUserId: admin.id
        }
    });
    console.log(`Seed completed successfully with rules ${goalSubmissionRule.name}, ${approvalRule.name}, and ${checkinRule.name}.`);
}
main()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
