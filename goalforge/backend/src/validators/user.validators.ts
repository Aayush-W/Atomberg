import { Role } from '@prisma/client';
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const managerIdParamSchema = z.object({
  managerId: z.string().uuid()
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
  department: z.string().trim().min(2),
  managerId: z.string().uuid().nullable().optional()
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    password: z.string().min(8).optional(),
    role: z.nativeEnum(Role).optional(),
    department: z.string().trim().min(2).optional(),
    managerId: z.string().uuid().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
