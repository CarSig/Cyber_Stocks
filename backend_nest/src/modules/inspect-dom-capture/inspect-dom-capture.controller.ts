import { Controller, Post, Get, Patch, Body, Param, Query, HttpCode, UseGuards, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "@/common/decorators/public.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { AppError } from "@/shared/errors";
import { FeedbackPayloadSchema, ReviewPayloadSchema, FEEDBACK_STATUSES, type FeedbackStatus } from "./inspect-dom-capture.dto";
import { InspectDomCaptureService } from "./inspect-dom-capture.service";
import { AuthService } from "@/modules/auth/auth.service";

@Controller("inspect-dom-capture")
export class InspectDomCaptureController {
  constructor(
    private readonly service: InspectDomCaptureService,
    private readonly authService: AuthService,
  ) {}

  // ── Public: called by the floating feedback button ──────────────────────

  @Public()
  @Post("feedback")
  @HttpCode(204)
  async submitFeedback(@Body() body: unknown, @Req() req: Request): Promise<void> {
    const parsed = FeedbackPayloadSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    let submittedBy = 'guest';
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.authService.verifyToken(authHeader.slice(7));
        submittedBy = payload.username;
      } catch {
        // invalid/expired token — fall back to guest
      }
    }

    await this.service.save(parsed.data, submittedBy);
  }

  // ── Admin: list & review ─────────────────────────────────────────────────

  @Get("feedback")
  @UseGuards(RolesGuard)
  @Roles("admin")
  list(
    @Query("limit") limit = "50",
    @Query("offset") offset = "0",
    @Query("status") status?: string,
  ) {
    const parsedStatus = FEEDBACK_STATUSES.includes(status as FeedbackStatus)
      ? (status as FeedbackStatus)
      : undefined;
    return this.service.list(Math.min(parseInt(limit, 10) || 50, 200), parseInt(offset, 10) || 0, parsedStatus);
  }

  @Patch("feedback/:id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  review(@Param("id") id: string, @Body() body: unknown) {
    const parsed = ReviewPayloadSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    return this.service.review(id, parsed.data);
  }
}
