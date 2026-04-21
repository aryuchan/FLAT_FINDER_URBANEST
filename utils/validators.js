// utils/validators.js — Zod Schema Validation
import { z } from 'zod';

// Fixes: API inputs max-length guards (name <= 120, city <= 100)
export const signupSchema = z.object({
  name:     z.string().min(2).max(120),
  email:    z.string().email(),
  password: z.string().min(8).max(100),
  role:     z.enum(['admin', 'owner', 'tenant']).optional()
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
