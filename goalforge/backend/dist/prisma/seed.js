"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.checkIn.deleteMany();
    await prisma.goalDependency.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.escalationRule.deleteMany();
    await prisma.cycle.deleteMany();
    await prisma.user.deleteMany();
    const adminPassword = await bcrypt_1.default.hash('Admin@123', 10);
    const managerPassword = await bcrypt_1.default.hash('Manager@123', 10);
    const employeePassword = await bcrypt_1.default.hash('Employee@123', 10);
    const admin = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@goalforge.com',
            password: adminPassword,
            role: client_1.Role.ADMIN,
            department: 'Executive'
        }
    });
    const managers = await Promise.all([
        prisma.user.create({
            data: { name: 'Manager One', email: 'manager1@goalforge.com', password: managerPassword, role: client_1.Role.MANAGER, department: 'Innovation', managerId: admin.id }
        }),
        prisma.user.create({
            data: { name: 'Manager Two', email: 'manager2@goalforge.com', password: managerPassword, role: client_1.Role.MANAGER, department: 'Revenue Growth', managerId: admin.id }
        }),
        prisma.user.create({
            data: { name: 'Manager Three', email: 'manager3@goalforge.com', password: managerPassword, role: client_1.Role.MANAGER, department: 'Operational Excellence', managerId: admin.id }
        })
    ]);
    const employees = await Promise.all([
        prisma.user.create({ data: { name: 'Alice Kim', email: 'alice@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Innovation', managerId: managers[0].id } }),
        prisma.user.create({ data: { name: 'Ben Carter', email: 'ben@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Innovation', managerId: managers[0].id } }),
        prisma.user.create({ data: { name: 'Carmen Diaz', email: 'carmen@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Innovation', managerId: managers[0].id } }),
        prisma.user.create({ data: { name: 'Daniel Lee', email: 'daniel@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Revenue Growth', managerId: managers[1].id } }),
        prisma.user.create({ data: { name: 'Erika Patel', email: 'erika@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Revenue Growth', managerId: managers[1].id } }),
        prisma.user.create({ data: { name: 'Felix Wang', email: 'felix@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Revenue Growth', managerId: managers[1].id } }),
        prisma.user.create({ data: { name: 'Gia Shah', email: 'gia@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Operational Excellence', managerId: managers[2].id } }),
        prisma.user.create({ data: { name: 'Hugo Martinez', email: 'hugo@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Operational Excellence', managerId: managers[2].id } }),
        prisma.user.create({ data: { name: 'Isha Rao', email: 'isha@goalforge.com', password: employeePassword, role: client_1.Role.EMPLOYEE, department: 'Operational Excellence', managerId: managers[2].id } })
    ]);
    const cycle = await prisma.cycle.create({
        data: {
            name: 'FY 2025-26',
            startDate: new Date('2025-05-01T00:00:00Z'),
            endDate: new Date('2026-04-30T23:59:59Z'),
            goalSettingOpen: new Date('2025-05-01T00:00:00Z'),
            q1Open: new Date('2025-07-01T00:00:00Z'),
            q2Open: new Date('2025-10-01T00:00:00Z'),
            q3Open: new Date('2026-01-01T00:00:00Z'),
            q4Open: new Date('2026-03-01T00:00:00Z'),
            bypassWindow: false
        }
    });
    const baselineGoals = await Promise.all([
        prisma.goal.create({
            data: {
                userId: employees[0].id,
                cycleId: cycle.id,
                thrustArea: 'Innovation',
                title: 'Launch two prototype demos for new product line',
                description: 'Build and release two working prototypes to validate the new product concept and collect stakeholder feedback.',
                uomType: client_1.UoMType.MAX,
                target: 5,
                weightage: 40,
                status: client_1.GoalStatus.APPROVED,
                qualityScore: 87.5,
                qualityFeedback: { S: 5, M: 4, A: 5, R: 4, T: 5 }
            }
        }),
        prisma.goal.create({
            data: {
                userId: employees[3].id,
                cycleId: cycle.id,
                thrustArea: 'Revenue Growth',
                title: 'Close $1.2M of new pipeline in Q2',
                description: 'Drive qualified opportunities and close new business worth at least 1.2M by the end of Q2.',
                uomType: client_1.UoMType.MIN,
                target: 1200000,
                weightage: 50,
                status: client_1.GoalStatus.LOCKED,
                qualityScore: 92.0,
                qualityFeedback: { S: 5, M: 5, A: 4, R: 5, T: 5 },
                lockedAt: new Date('2025-07-15T12:00:00Z')
            }
        }),
        prisma.goal.create({
            data: {
                userId: employees[4].id,
                cycleId: cycle.id,
                thrustArea: 'Revenue Growth',
                title: 'Increase customer renewal rate by 10%',
                description: 'Implement retention tactics and engagement plans to achieve a 10% increase in renewals.',
                uomType: client_1.UoMType.MIN,
                target: 10,
                weightage: 40,
                status: client_1.GoalStatus.APPROVED,
                qualityScore: 84.0,
                qualityFeedback: { S: 4, M: 4, A: 4, R: 5, T: 4 },
                lockedAt: new Date('2025-08-01T09:00:00Z')
            }
        }),
        prisma.goal.create({
            data: {
                userId: employees[7].id,
                cycleId: cycle.id,
                thrustArea: 'Operational Excellence',
                title: 'Deploy automated team workload dashboard',
                description: 'Roll out an automated dashboard that tracks team workload, cycle times, and capacity utilization.',
                uomType: client_1.UoMType.TIMELINE,
                target: 1,
                targetDate: new Date('2025-12-15T00:00:00Z'),
                weightage: 60,
                status: client_1.GoalStatus.APPROVED,
                qualityScore: 88.0,
                qualityFeedback: { S: 5, M: 4, A: 5, R: 4, T: 5 },
                lockedAt: new Date('2025-09-10T15:30:00Z')
            }
        })
    ]);
    const [goalOne, goalTwo, goalThree, goalFour] = baselineGoals;
    const sharedPrimary = await prisma.goal.create({
        data: {
            userId: employees[1].id,
            cycleId: cycle.id,
            thrustArea: 'Innovation',
            title: 'Standardize quarterly innovation reviews',
            description: 'Create and deliver a templated review process for innovations each quarter.',
            uomType: client_1.UoMType.ZERO,
            target: 0,
            weightage: 40,
            status: client_1.GoalStatus.APPROVED,
            isShared: false,
            qualityScore: 90.0,
            qualityFeedback: { S: 5, M: 5, A: 4, R: 5, T: 5 },
            lockedAt: new Date('2025-08-10T10:00:00Z')
        }
    });
    const sharedChild = await prisma.goal.create({
        data: {
            userId: employees[2].id,
            cycleId: cycle.id,
            thrustArea: 'Innovation',
            title: sharedPrimary.title,
            description: sharedPrimary.description,
            uomType: sharedPrimary.uomType,
            target: sharedPrimary.target,
            weightage: 40,
            status: client_1.GoalStatus.APPROVED,
            isShared: true,
            parentGoalId: sharedPrimary.id,
            qualityScore: 90.0,
            qualityFeedback: sharedPrimary.qualityFeedback,
            lockedAt: new Date('2025-08-10T10:00:00Z')
        }
    });
    await prisma.goal.update({
        where: { id: sharedPrimary.id },
        data: { sharedWith: { connect: { id: sharedChild.id } } }
    });
    await prisma.checkIn.createMany({
        data: [
            {
                goalId: goalOne.id,
                userId: employees[0].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 42,
                completionDate: null,
                status: client_1.CheckInStatus.ON_TRACK,
                progressScore: 95,
                managerComment: 'Great start, keep refining the demos.',
                managerCheckedAt: new Date('2025-07-20T11:00:00Z'),
                sentiment: 0.3
            },
            {
                goalId: goalTwo.id,
                userId: employees[3].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 600000,
                completionDate: null,
                status: client_1.CheckInStatus.ON_TRACK,
                progressScore: 100,
                managerComment: 'Pipeline is shaping up well.',
                managerCheckedAt: new Date('2025-07-25T15:00:00Z'),
                sentiment: 0.5
            },
            {
                goalId: goalThree.id,
                userId: employees[4].id,
                quarter: client_1.Quarter.Q2,
                actualValue: 6,
                completionDate: null,
                status: client_1.CheckInStatus.ON_TRACK,
                progressScore: 100,
                managerComment: 'Renewals are trending positive.',
                managerCheckedAt: new Date('2025-10-15T09:00:00Z'),
                sentiment: 0.2
            },
            {
                goalId: goalFour.id,
                userId: employees[7].id,
                quarter: client_1.Quarter.Q1,
                actualValue: 1,
                completionDate: new Date('2025-11-10T00:00:00Z'),
                status: client_1.CheckInStatus.COMPLETED,
                progressScore: 100,
                managerComment: 'Dashboard is live for the team.',
                managerCheckedAt: new Date('2025-11-12T10:00:00Z'),
                sentiment: 0.6
            }
        ]
    });
    await prisma.escalationRule.createMany({
        data: [
            {
                name: 'Goal submission overdue',
                triggerType: 'GOAL_NOT_SUBMITTED',
                daysThreshold: 7,
                escalationChain: JSON.stringify([{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }])
            },
            {
                name: 'Approval pending escalation',
                triggerType: 'APPROVAL_PENDING',
                daysThreshold: 3,
                escalationChain: JSON.stringify([{ level: 1, notifyRole: 'MANAGER' }, { level: 2, notifyRole: 'ADMIN' }])
            },
            {
                name: 'Missing quarterly check-in',
                triggerType: 'CHECKIN_MISSING',
                daysThreshold: 5,
                escalationChain: JSON.stringify([{ level: 1, notifyRole: 'MANAGER' }])
            }
        ]
    });
    await prisma.notification.createMany({
        data: [
            {
                userId: employees[0].id,
                type: 'GOAL_REMINDER',
                title: 'Goal draft pending',
                message: 'Your draft goal needs submission before the manager review window.',
                isRead: false
            },
            {
                userId: managers[0].id,
                type: 'APPROVAL_PENDING',
                title: 'Approval required',
                message: 'Alice Kim has submitted goals that require your review.',
                isRead: false
            }
        ]
    });
    console.log('Seed completed successfully.');
}
main()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
