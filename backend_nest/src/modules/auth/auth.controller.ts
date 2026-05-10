import { Controller, Post, Get, Body, HttpCode, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { AuditService } from "@/modules/audit/audit.service";
import { loginSchema, registerSchema, googleAuthSchema, clerkAuthSchema } from "@/shared/validation";
import { AppError } from "@/shared/errors";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/types/index";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post("login")
  @Public()
  @HttpCode(200)
  async login(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const result = await this.authService.login(parsed.data.username, parsed.data.password);
    this.auditService.log(result.user, "login");
    return result;
  }

  @Post("register")
  @Public()
  @HttpCode(201)
  async register(@Body() body: unknown) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const result = await this.authService.register(parsed.data.username, parsed.data.password);
    this.auditService.log(result.user, "register");
    return result;
  }

  @Post("google")
  @Public()
  @HttpCode(200)
  async googleAuth(@Body() body: unknown) {
    const parsed = googleAuthSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const result = await this.authService.googleAuth(parsed.data.credential);
    this.auditService.log(result.user, "google_auth");
    return result;
  }

  @Post("clerk")
  @Public()
  @HttpCode(200)
  async clerkAuth(@Body() body: unknown) {
    const parsed = clerkAuthSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const result = await this.authService.clerkAuth(parsed.data.token);
    this.auditService.log(result.user, "clerk_auth");
    return result;
  }

  @Get("me")
  me(@CurrentUser() user: User) {
    return user;
  }
}
