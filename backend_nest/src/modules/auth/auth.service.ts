import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
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
  google_id?: string;
  password_hash?: string;
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

  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const { rows } = await this.db.pool.query<StoredUser>(
      `SELECT * FROM users WHERE username = $1`,
      [username],
    );
    const user = rows[0];
    if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      throw new AppError("Invalid credentials", 401);
    }
    return { token: signToken(user), user: publicUser(user) };
  }

  async register(username: string, password: string): Promise<{ token: string; user: User }> {
    const passwordHash = bcrypt.hashSync(password, 10);
    const { rows } = await this.db.pool.query<StoredUser>(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'user')
       RETURNING *`,
      [username, passwordHash],
    ).catch((e: { code?: string }) => {
      if (e.code === "23505") throw new AppError("Username already taken", 409);
      throw e;
    });
    return { token: signToken(rows[0]), user: publicUser(rows[0]) };
  }

  async googleAuth(credential: string): Promise<{ token: string; user: User }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new AppError("Google OAuth not configured", 503);
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new AppError("Invalid Google token", 400);
    const { sub, email } = payload;

    return this.upsertOAuthUser(sub, email);
  }

  async clerkAuth(sessionToken: string): Promise<{ token: string; user: User }> {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) throw new AppError("Clerk not configured", 503);
    const clerk = createClerkClient({ secretKey });
    const payload = await clerkVerifyToken(sessionToken, {
      secretKey,
      authorizedParties: ["http://localhost:5173"],
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
      `SELECT * FROM users WHERE google_id = $1`,
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
          `INSERT INTO users (username, google_id, email, role)
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

// --- OLD FILE-BASED IMPLEMENTATION (kept until DB path is verified) ---
// import fs from "fs";
// import path from "path";
// import { PATHS } from "@/shared/paths";
//
// const USERS_PATH = PATHS.users;
//
// function readUsers(): StoredUser[] {
//   if (!fs.existsSync(USERS_PATH)) return [];
//   return JSON.parse(fs.readFileSync(USERS_PATH, "utf-8")) as StoredUser[];
// }
// function writeUsers(users: StoredUser[]): void {
//   fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
//   fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
// }
