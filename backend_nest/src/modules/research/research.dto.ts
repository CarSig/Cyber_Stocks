import { IsEnum, IsString, MinLength, IsArray, ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ChatMessage } from "@algo/shared";

export class ChatMessageDto implements ChatMessage {
  @ApiProperty({ enum: ["user", "assistant"] })
  @IsEnum(["user", "assistant"])
  role: "user" | "assistant";

  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;
}

export class ChatBodyDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;
}
