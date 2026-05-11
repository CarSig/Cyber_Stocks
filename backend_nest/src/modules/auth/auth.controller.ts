import { Controller, Post, Get, Body, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuditService } from "@/modules/audit/audit.service";
import { ClerkAuthDto, AuthResponseDto, UserDto } from "@/shared/dto";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
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
  @ApiOperation({ summary: "Authenticate via Clerk", description: "Verifies a Clerk session token. Creates the user on first login and returns a JWT + user object." })
  @ApiResponse({ status: 200, description: "Authentication successful", type: AuthResponseDto })
  @ApiResponse({ status: 401, description: "Invalid Clerk token" })
  async clerkAuth(@Body() body: ClerkAuthDto) {
    const result = await this.authService.clerkAuth(body.token);
    this.auditService.log(result.user, "clerk_auth");
    return result;
  }

  @Get("me")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get current user", description: "Returns the authenticated user derived from the Bearer JWT." })
  @ApiResponse({ status: 200, description: "Authenticated user object", type: UserDto })
  @ApiResponse({ status: 401, description: "Missing or invalid JWT" })
  me(@CurrentUser() user: User) {
    return user;
  }
}
