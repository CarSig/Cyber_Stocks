import { z } from "zod";

export const windowDaysSchema = z.coerce.number().int().positive().max(730).optional();
export const lagDaysSchema    = z.coerce.number().int().min(0).max(365).default(1);

export const paginationSchema = z.object({
  limit:  z.coerce.number().int().positive().max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const simulateBodySchema = z.object({
  actions: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      type: z.enum(["buy", "sell"]),
      value: z.number().positive(),
    })
  ).default([]),
});

export const chatBodySchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(["user", "assistant"]),
    content: z.string().min(1),
  })).min(1),
  context: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

export const clerkAuthSchema = z.object({
  token: z.string().min(1),
});

export type Pagination      = z.infer<typeof paginationSchema>;
export type SimulateBody    = z.infer<typeof simulateBodySchema>;
export type ChatBody        = z.infer<typeof chatBodySchema>;
export type LoginBody       = z.infer<typeof loginSchema>;
export type RegisterBody    = z.infer<typeof registerSchema>;
export type GoogleAuthBody  = z.infer<typeof googleAuthSchema>;
export type ClerkAuthBody   = z.infer<typeof clerkAuthSchema>;
