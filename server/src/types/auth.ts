import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  jobTitle: string | null;
  managerId: string | null;
}

export interface AuthTokenPayload {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

export interface PublicUser {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  jobTitle: string | null;
  managerId: string | null;
}
