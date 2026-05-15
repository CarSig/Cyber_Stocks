import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthResponseDto, UserDto } from "@/shared/dto";

export const ClerkAuthDoc = () => applyDecorators(
  ApiOperation({ summary: "Authenticate via Clerk", description: "Verifies a Clerk session token. Creates the user on first login and returns a JWT + user object." }),
  ApiResponse({ status: 200, description: "Authentication successful", type: AuthResponseDto }),
  ApiResponse({ status: 401, description: "Invalid Clerk token" }),
);

export const MeDoc = () => applyDecorators(
  ApiBearerAuth("bearer"),
  ApiOperation({ summary: "Get current user", description: "Returns the authenticated user derived from the Bearer JWT." }),
  ApiResponse({ status: 200, description: "Authenticated user object", type: UserDto }),
  ApiResponse({ status: 401, description: "Missing or invalid JWT" }),
);
