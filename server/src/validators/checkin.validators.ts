import { CheckInStatus, Quarter } from '@prisma/client';
import { z } from 'zod';

const optionalDateString = z
  .string()
  .datetime()
  .transform((value) => new Date(value))
  .nullable()
  .optional();

export const checkInIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createCheckInSchema = z.object({
  goalId: z.string().uuid(),
  quarter: z.nativeEnum(Quarter),
  actualValue: z.number().finite(),
  completionDate: optionalDateString,
  status: z.nativeEnum(CheckInStatus).optional(),
  employeeNote: z.string().trim().min(1).max(1000).optional()
});

export const updateCheckInSchema = z
  .object({
    actualValue: z.number().finite().optional(),
    completionDate: optionalDateString,
    status: z.nativeEnum(CheckInStatus).optional(),
    employeeNote: z.string().trim().min(1).max(1000).optional(),
    managerComment: z.string().trim().min(1).optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type UpdateCheckInInput = z.infer<typeof updateCheckInSchema>;
