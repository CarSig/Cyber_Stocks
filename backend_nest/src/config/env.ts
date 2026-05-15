import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:        z.enum(["development", "production", "test"]).default("development"),
  PORT:            z.coerce.number().default(3000),
  DATABASE_URL:    z.string().min(1),
  JWT_SECRET:      z.string().min(32),
  CLERK_SECRET_KEY: z.string().min(1),
  ALLOWED_ORIGIN:  z.string().default("http://localhost:5173"),
  // Optional — absence is fine, features degrade gracefully
  REDIS_URL:           z.string().optional(),
  AMQP_URL:            z.string().optional(),
  ANTHROPIC_API_KEY:   z.string().optional(),
  SENTRY_DSN:          z.string().optional(),
  LOG_LEVEL:           z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`\n[startup] Missing or invalid environment variables:\n${missing}\n`);
    process.exit(1);
  }
  return result.data;
}
