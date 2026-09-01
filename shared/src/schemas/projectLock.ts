import { z } from 'zod';

export const projectLockUpdateSchema = z.object({
  locked: z.boolean(),
});

export type ProjectLockUpdateInput = z.infer<typeof projectLockUpdateSchema>;
