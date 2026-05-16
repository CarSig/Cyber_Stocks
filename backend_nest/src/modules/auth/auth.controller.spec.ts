import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuditService } from "@/modules/audit/audit.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { HttpExceptionFilter } from "@/common/errors/http-exception.filter";
import { AppError } from "@/shared/errors";
import { APP_GUARD } from "@nestjs/core";
import { Reflector } from "@nestjs/core";

const MOCK_USER = { id: "user-1", username: "testuser", role: "user" as const };
const MOCK_TOKEN = "signed.jwt.token";

const mockAuthService = {
  clerkAuth: jest.fn(),
  verifyToken: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      { provide: AuthService,  useValue: mockAuthService },
      { provide: AuditService, useValue: mockAuditService },
      Reflector,
      {
        provide: APP_GUARD,
        useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector, mockAuthService as never),
        inject: [Reflector],
      },
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe("AuthController (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /auth/clerk ────────────────────────────────────────────────────────

  describe("POST /auth/clerk", () => {
    it("returns 200 with token and user on valid Clerk token", async () => {
      mockAuthService.clerkAuth.mockResolvedValue({ token: MOCK_TOKEN, user: MOCK_USER });

      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "valid-clerk-session-token" })
        .expect(200);

      expect(res.body).toEqual({ token: MOCK_TOKEN, user: MOCK_USER });
      expect(mockAuthService.clerkAuth).toHaveBeenCalledWith("valid-clerk-session-token");
    });

    it("returns 400 when token field is missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(mockAuthService.clerkAuth).not.toHaveBeenCalled();
    });

    it("returns 400 when token is an empty string", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(mockAuthService.clerkAuth).not.toHaveBeenCalled();
    });

    it("returns 401 when Clerk token is invalid", async () => {
      mockAuthService.clerkAuth.mockRejectedValue(new AppError("Invalid Clerk token", 401));

      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "bad-clerk-token" })
        .expect(401);

      expect(res.body).toHaveProperty("error");
    });

    it("logs the clerk_auth action on success", async () => {
      mockAuthService.clerkAuth.mockResolvedValue({ token: MOCK_TOKEN, user: MOCK_USER });

      await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "valid-clerk-session-token" })
        .expect(200);

      expect(mockAuditService.log).toHaveBeenCalledWith(MOCK_USER, "clerk_auth");
    });

    it("returns 503 when Clerk is not configured", async () => {
      mockAuthService.clerkAuth.mockRejectedValue(new AppError("Clerk not configured", 503));

      const res = await request(app.getHttpServer())
        .post("/auth/clerk")
        .send({ token: "any-token" })
        .expect(503);

      expect(res.body).toHaveProperty("error");
    });
  });

  // ── GET /auth/me ────────────────────────────────────────────────────────────

  describe("GET /auth/me", () => {
    it("returns 401 with no Authorization header", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .expect(401);
    });

    it("returns 401 with an invalid JWT", async () => {
      mockAuthService.verifyToken.mockImplementation(() => { throw new Error("invalid token"); });

      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "Bearer bad.jwt.token")
        .expect(401);
    });

    it("returns 200 with user payload on valid JWT", async () => {
      mockAuthService.verifyToken.mockReturnValue(MOCK_USER);

      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual(MOCK_USER);
    });
  });
});
