import { z } from 'zod';

export const LoginBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(128),
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional(),
  deviceInfo: z.string().trim().max(500).optional(),
});

export const MfaVerifyBodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});
