import { UoMType } from '@prisma/client';
import { z } from 'zod';

const optionalDateString = z
  .string()
  .datetime()
  .transform((value) => new Date(value))
  .nullable()
  .optional();

export const goalIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createGoalSchema = z.object({
  cycleId: z.string().uuid().optional(),
  thrustArea: z.string().trim().min(2),
  title: z.string().trim().min(3),
  description: z.string().trim().min(10),
  uomType: z.nativeEnum(UoMType),
  target: z.number().finite(),
  targetDate: optionalDateString,
  weightage: z.number().min(10).max(80),
  qualityScore: z.number().min(0).max(100).optional(),
  qualityFeedback: z.unknown().optional()
});

export const updateGoalSchema = createGoalSchema
  .omit({ cycleId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export const rejectGoalSchema = z.object({
  comment: z.string().trim().min(3)
});

export const approveGoalSchema = z.object({
  comment: z.string().trim().optional()
});

export const sharedGoalSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  cycleId: z.string().uuid().optional(),
  thrustArea: z.string().trim().min(2),
  title: z.string().trim().min(3),
  description: z.string().trim().min(10),
  uomType: z.nativeEnum(UoMType),
  target: z.number().finite(),
  targetDate: optionalDateString,
  weightage: z.number().min(10).max(80),
  qualityScore: z.number().min(0).max(100).optional(),
  qualityFeedback: z.unknown().optional()
});

export const dependencySchema = z.object({
  requiredGoalId: z.string().uuid()
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ApproveGoalInput = z.infer<typeof approveGoalSchema>;
export type RejectGoalInput = z.infer<typeof rejectGoalSchema>;
export type SharedGoalInput = z.infer<typeof sharedGoalSchema>;
export type DependencyInput = z.infer<typeof dependencySchema>;
