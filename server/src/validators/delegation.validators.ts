import { z } from 'zod';

export const createDelegationSchema = z.object({
  delegatorManagerId: z.string().uuid().optional(),
  delegateManagerId: z.string().uuid(),
  startsAt: z.string().datetime().transform((value) => new Date(value)),
  endsAt: z.string().datetime().transform((value) => new Date(value)),
  reason: z.string().trim().min(5).max(300)
});

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
