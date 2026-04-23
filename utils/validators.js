import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["tenant", "owner"]),
});

export const addFlatSchema = z.object({
  title: z.string().min(5),
  city: z.string().min(2),
  rent: z.number().positive(),
  type: z.enum([
    "Studio",
    "1BHK",
    "2BHK",
    "3BHK",
    "4BHK+",
    "Penthouse",
    "Premium Residence",
  ]),
  images: z.string().optional(),
});

export const bookingSchema = z.object({
  flat_id: z.string().uuid(),
  check_in: z.string(),
  check_out: z.string(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});
