import { Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { createClerkClient, verifyToken as clerkVerifyToken } from "@clerk/backend";
import type { User } from "@/types/index";
import { AppError } from "@/shared/errors";
import { CoreDbService } from "@/shared/core-db.service";

const JWT_EXPIRES = "7d";

type StoredUser = {
  id: string;
  username: string;
  role: "user" | "admin";
  email?: string;
  oauth_id?: string;
  created_at: string;
};

export type TokenPayload = {
  id: string;
  username: string;
  role: "user" | "admin";
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET env var must be set and at least 32 characters long");
  return secret;
}

function signToken(user: StoredUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES },
  );
}

function publicUser(user: StoredUser): User {
  return { id: user.id, username: user.username, role: user.role };
}

@Injectable()
export class AuthService {
  constructor(private readonly db: CoreDbService) {}

  async clerkAuth(sessionToken: string): Promise<{ token: string; user: User }> {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) throw new AppError("Clerk not configured", 503);
    const clerk = createClerkClient({ secretKey });
    const payload = await clerkVerifyToken(sessionToken, {
      secretKey,
      authorizedParties: (process.env.ALLOWED_ORIGIN ?? "http://localhost:5173").split(",").map(o => o.trim()),
    }).catch((e) => { throw new AppError(`Invalid Clerk token: ${(e as Error).message}`, 401); });
    if (!payload?.sub) throw new AppError("Invalid Clerk token", 401);
    const clerkUserId = payload.sub;

    const clerkUser = await clerk.users.getUser(clerkUserId).catch(() => null);
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
    return this.upsertOAuthUser(clerkUserId, email);
  }

  private async upsertOAuthUser(oauthId: string, email: string): Promise<{ token: string; user: User }> {
    // Return existing user if already linked
    const existing = await this.db.pool.query<StoredUser>(
      `SELECT * FROM users WHERE oauth_id = $1`,
      [oauthId],
    );
    if (existing.rows[0]) return { token: signToken(existing.rows[0]), user: publicUser(existing.rows[0]) };

    // Derive a unique username, appending a suffix if taken
    const base = email ? email.split("@")[0] : oauthId.slice(0, 16);
    let username = base;
    let attempt = 0;
    while (true) {
      try {
        const { rows } = await this.db.pool.query<StoredUser>(
          `INSERT INTO users (username, oauth_id, email, role)
           VALUES ($1, $2, $3, 'user')
           RETURNING *`,
          [username, oauthId, email || null],
        );
        return { token: signToken(rows[0]), user: publicUser(rows[0]) };
      } catch (e: unknown) {
        const pg = e as { code?: string; constraint?: string };
        if (pg.code === "23505" && pg.constraint === "users_username_key") {
          attempt++;
          username = `${base}_${attempt}`;
          continue;
        }
        throw e;
      }
    }
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  }
}
