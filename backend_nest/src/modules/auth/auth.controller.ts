import { Controller, Post, Get, Body, HttpCode } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuditService } from "@/modules/audit/audit.service";
import { ClerkAuthDto } from "@/shared/dto";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ClerkAuthDoc, MeDoc } from "./auth.docs";
import type { User } from "@/types/index";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post("clerk")
  @Public()
  @HttpCode(200)
  @ClerkAuthDoc()
  async clerkAuth(@Body() body: ClerkAuthDto) {
    const result = await this.authService.clerkAuth(body.token);
    this.auditService.log(result.user, "clerk_auth");
    return result;
  }

  @Get("me")
  @MeDoc()
  me(@CurrentUser() user: User) {
    return user;
  }
}
