import { KudosBadgeType } from '@prisma/client';
import { z } from 'zod';

export const createKudosSchema = z.object({
  receiverId: z.string().uuid(),
  goalId: z.string().uuid().optional(),
  badgeType: z.nativeEnum(KudosBadgeType),
  note: z.string().trim().min(3).max(300)
});

export type CreateKudosInput = z.infer<typeof createKudosSchema>;
