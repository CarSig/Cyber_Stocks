import { IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { User, AuthResponse } from "@algo/shared";

export class ClerkAuthDto {
  @ApiProperty({ description: "Clerk session token" })
  @IsString()
  @MinLength(1)
  token: string;
}

export class UserDto implements User {
  @ApiProperty({ description: "User UUID" })
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ enum: ["user", "admin"] })
  role: "user" | "admin";

  @ApiPropertyOptional()
  email?: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ description: "Signed JWT for subsequent requests" })
  token: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
