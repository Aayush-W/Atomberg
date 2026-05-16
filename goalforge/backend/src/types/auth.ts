import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  managerId: string | null;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  managerId: string | null;
}
