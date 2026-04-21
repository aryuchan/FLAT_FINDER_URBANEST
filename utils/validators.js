// utils/validators.js — Hardened Zod Schemas
// Fixes: Bug #8 and Security Mandate (Max-length guards)

import { z } from 'zod';

export const signupSchema = z.object({
  name:     z.string().min(2).max(120),
  email:    z.string().email().max(255),
  password: z.string().min(8).max(100),
  role:     z.enum(['admin', 'owner', 'tenant']).default('tenant')
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1)
});

export const addFlatSchema = z.object({
  title: z.string().min(5).max(120),
  city:  z.string().min(2).max(100),
  rent:  z.number().positive(),
  type:  z.string().min(1).max(50)
});

export const bookingSchema = z.object({
  flat_id:   z.string().uuid(),
  check_in:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  status: z.enum(['active', 'suspended']).optional()
});
