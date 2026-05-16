// ── Clerk mock ──────────────────────────────────────────────────────────────
// jest.mock is hoisted before variable declarations. The factory captures jest.fn()
// stubs in a local object; tests configure them via mockImplementation / mockResolvedValue.

const clerkStubs = {
  verifyToken: jest.fn(),
  getUser: jest.fn(),
};

jest.mock("@clerk/backend", () => ({
  createClerkClient: jest.fn(() => ({
    users: { getUser: (...a: unknown[]) => clerkStubs.getUser(...a) },
  })),
  verifyToken: (...a: unknown[]) => clerkStubs.verifyToken(...a),
}));

// ── Imports (after jest.mock declarations) ───────────────────────────────────

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import request from "supertest";
import jwt from "jsonwebtoken";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { HttpExceptionFilter } from "@/common/errors/http-exception.filter";
import { CoreDbService } from "@/shared/core-db.service";

// ── Constants ────────────────────────────────────────────────────────────────

const TEST_OAUTH_PREFIX = "clerk_test_";
const TEST_OAUTH_ID = `${TEST_OAUTH_PREFIX}integration_001`;
const TEST_EMAIL = "integration@example.com";
const TEST_USERNAME = "integration"; // derived from email prefix

// ── Helpers ──────────────────────────────────────────────────────────────────

function fakeClerkSuccess(oauthId = TEST_OAUTH_ID, email = TEST_EMAIL) {
  clerkStubs.verifyToken.mockResolvedValue({ sub: oauthId });
  clerkStubs.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: email }],
  });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("Auth (integration — real DB)", () => {
  let app: INestApplication;
  let db: CoreDbService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
      providers: [
        Reflector,
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector, auth: AuthService) =>
            new JwtAuthGuard(reflector, auth),
          inject: [Reflector, AuthService],
        },
      ],
    }).compile();

    db = module.get(CoreDbService);

    // Create isolated schema; onApplicationBootstrap will create tables inside it
    // because DATABASE_URL in .env.test sets search_path=test.
    await db.pool.query(`CREATE SCHEMA IF NOT EXISTS test`);

    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await db.pool.query(`DROP SCHEMA IF EXISTS test CASCADE`);
    await app.close();
  });

  afterEach(async () => {
    clerkStubs.verifyToken.mockReset();
    clerkStubs.getUser.mockReset();
    await db.pool.query(
      `DELETE FROM users WHERE oauth_id LIKE $1`,
      [`${TEST_OAUTH_PREFIX}%`],
    );
  });

  // ── POST /auth/clerk ────────────────────────────────────────────────────────

  describe("POST /auth/clerk", () => {
    it("creates a new user row and returns a signed JWT", async () => {
      fakeClerkSuccess();

      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "fake-session-token" })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe(TEST_USERNAME);
      expect(res.body.user.role).toBe("user");

      const { rows } = await db.pool.query(
        `SELECT * FROM users WHERE oauth_id = $1`,
        [TEST_OAUTH_ID],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe(TEST_EMAIL);
    });

    it("upserts — same user ID on second login, no duplicate row", async () => {
      fakeClerkSuccess();

      const first = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "fake-session-token" })
        .expect(200);

      const second = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "fake-session-token" })
        .expect(200);

      expect(first.body.user.id).toBe(second.body.user.id);

      const { rows } = await db.pool.query(
        `SELECT COUNT(*) AS cnt FROM users WHERE oauth_id = $1`,
        [TEST_OAUTH_ID],
      );
      expect(Number(rows[0].cnt)).toBe(1);
    });

    it("appends _1 suffix when derived username is already taken", async () => {
      // Pre-occupy the base username
      await db.pool.query(
        `INSERT INTO users (username, oauth_id, email, role) VALUES ($1, $2, $3, 'user')`,
        [TEST_USERNAME, `${TEST_OAUTH_PREFIX}preexisting`, TEST_EMAIL],
      );

      fakeClerkSuccess(`${TEST_OAUTH_PREFIX}integration_002`, TEST_EMAIL);

      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "fake-session-token" })
        .expect(200);

      expect(res.body.user.username).toBe(`${TEST_USERNAME}_1`);
    });

    it("returns 401 when Clerk token verification throws", async () => {
      clerkStubs.verifyToken.mockRejectedValue(new Error("Token expired"));

      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "expired-token" })
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it("returns 400 when token field is missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({})
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  // ── GET /auth/me ────────────────────────────────────────────────────────────

  describe("GET /auth/me", () => {
    it("returns the authenticated user for a valid JWT", async () => {
      fakeClerkSuccess();

      const login = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "fake-session-token" })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${login.body.token}`)
        .expect(200);

      expect(res.body.id).toBe(login.body.user.id);
      expect(res.body.username).toBe(TEST_USERNAME);
    });

    it("returns 401 with no Authorization header", async () => {
      await request(app.getHttpServer()).get("/auth/me").expect(401);
    });

    it("returns 401 with a JWT signed by the wrong secret", async () => {
      const tampered = jwt.sign(
        { id: "fake-id", username: "hacker", role: "admin" },
        "wrong-secret",
      );

      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${tampered}`)
        .expect(401);
    });
  });
});
