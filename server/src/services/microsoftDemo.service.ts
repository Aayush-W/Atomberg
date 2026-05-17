import bcrypt from 'bcrypt';
import { AuthProvider, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

type DemoProfile = {
  email: string;
  name: string;
  department: string;
  jobTitle: string;
  role: Role;
  managerEmail?: string;
  entraId: string;
  tenantId: string;
};

const demoProfiles: DemoProfile[] = [
  {
    email: 'admin@goalforge.com',
    name: 'Admin User',
    department: 'Executive',
    jobTitle: 'HR Operations Director',
    role: Role.ADMIN,
    entraId: 'demo-admin',
    tenantId: 'demo-tenant'
  },
  {
    email: 'manager1@goalforge.com',
    name: 'Manager One',
    department: 'Innovation',
    jobTitle: 'Engineering Manager',
    role: Role.MANAGER,
    managerEmail: 'admin@goalforge.com',
    entraId: 'demo-manager-1',
    tenantId: 'demo-tenant'
  },
  {
    email: 'isha@goalforge.com',
    name: 'Isha Rao',
    department: 'Operational Excellence',
    jobTitle: 'Automation Engineer',
    role: Role.EMPLOYEE,
    managerEmail: 'manager3@goalforge.com',
    entraId: 'demo-entra-isha',
    tenantId: 'demo-tenant'
  }
];

export function getMicrosoftDemoProfiles() {
  return demoProfiles;
}

export async function syncMicrosoftDemoUser(email: string) {
  const profile = demoProfiles.find((entry) => entry.email === email.toLowerCase());
  if (!profile) {
    throw new Error('Unknown Microsoft demo profile');
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: profile.tenantId }, { name: profile.tenantId }]
    }
  });
  if (!tenant) {
    throw new Error(`Tenant ${profile.tenantId} is not configured`);
  }

  const manager = profile.managerEmail
    ? await prisma.user.findUnique({ where: { email: profile.managerEmail } })
    : null;

  const password = await bcrypt.hash('MicrosoftDemo@123', 10);

  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      name: profile.name,
      tenantId: tenant.id,
      department: profile.department,
      jobTitle: profile.jobTitle,
      role: profile.role,
      managerId: manager?.id ?? null,
      authProvider: AuthProvider.MICROSOFT_DEMO,
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
      authProvider: AuthProvider.MICROSOFT_DEMO,
      microsoftEntraId: profile.entraId,
      microsoftTenantId: profile.tenantId
    },
    include: { tenant: true }
  });

  return user;
}
