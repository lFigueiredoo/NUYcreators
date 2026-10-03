import { z } from 'zod';
export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(256),
});
export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(100),
  terms: z.literal('on'),
});
export const recoverySchema = z.object({ email: z.email().max(254) });
export const resetSchema = z.object({
  userId: z.string().min(1).max(36),
  secret: z.string().min(1).max(512),
  password: z.string().min(8).max(256),
});
export const verificationSchema = z.object({
  userId: z.string().min(1).max(36),
  secret: z.string().min(1).max(512),
});
