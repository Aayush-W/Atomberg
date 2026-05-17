"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMicrosoftDemoProfiles = getMicrosoftDemoProfiles;
exports.syncMicrosoftDemoUser = syncMicrosoftDemoUser;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const demoProfiles = [
    {
        email: 'admin@goalforge.com',
        name: 'Admin User',
        department: 'Executive',
        jobTitle: 'HR Operations Director',
        role: client_1.Role.ADMIN,
        entraId: 'demo-admin',
        tenantId: 'demo-tenant'
    },
    {
        email: 'manager1@goalforge.com',
        name: 'Manager One',
        department: 'Innovation',
        jobTitle: 'Engineering Manager',
        role: client_1.Role.MANAGER,
        managerEmail: 'admin@goalforge.com',
        entraId: 'demo-manager-1',
        tenantId: 'demo-tenant'
    },
    {
        email: 'isha@goalforge.com',
        name: 'Isha Rao',
        department: 'Operational Excellence',
        jobTitle: 'Automation Engineer',
        role: client_1.Role.EMPLOYEE,
        managerEmail: 'manager3@goalforge.com',
        entraId: 'demo-entra-isha',
        tenantId: 'demo-tenant'
    }
];
function getMicrosoftDemoProfiles() {
    return demoProfiles;
}
async function syncMicrosoftDemoUser(email) {
    const profile = demoProfiles.find((entry) => entry.email === email.toLowerCase());
    if (!profile) {
        throw new Error('Unknown Microsoft demo profile');
    }
    const tenant = await prisma_1.prisma.tenant.findFirst({
        where: {
            OR: [{ slug: profile.tenantId }, { name: profile.tenantId }]
        }
    });
    if (!tenant) {
        throw new Error(`Tenant ${profile.tenantId} is not configured`);
    }
    const manager = profile.managerEmail
        ? await prisma_1.prisma.user.findUnique({ where: { email: profile.managerEmail } })
        : null;
    const password = await bcrypt_1.default.hash('MicrosoftDemo@123', 10);
    const user = await prisma_1.prisma.user.upsert({
        where: { email: profile.email },
        update: {
            name: profile.name,
            tenantId: tenant.id,
            department: profile.department,
            jobTitle: profile.jobTitle,
            role: profile.role,
            managerId: manager?.id ?? null,
            authProvider: client_1.AuthProvider.MICROSOFT_DEMO,
            microsoftEntraId: profile.entraId,
            microsoftTenantId: profile.tenantId
        },
        create: {
            name: profile.name,
            email: profile.email,
            password,
            tenantId: tenant.id,
            department: profile.department,
            jobTitle: profile.jobTitle,
            role: profile.role,
            managerId: manager?.id ?? null,
            authProvider: client_1.AuthProvider.MICROSOFT_DEMO,
            microsoftEntraId: profile.entraId,
            microsoftTenantId: profile.tenantId
        },
        include: { tenant: true }
    });
    return user;
}
