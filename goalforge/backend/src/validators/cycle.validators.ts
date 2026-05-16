import { z } from 'zod';

const dateString = z.string().datetime().transform((value) => new Date(value));

export const cycleIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createCycleSchema = z.object({
  name: z.string().trim().min(2),
  startDate: dateString,
  endDate: dateString,
  isActive: z.boolean().optional(),
  goalSettingOpen: dateString,
  q1Open: dateString,
  q2Open: dateString,
  q3Open: dateString,
  q4Open: dateString,
  bypassWindow: z.boolean().optional()
});

export const updateCycleSchema = createCycleSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required'
});

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;
