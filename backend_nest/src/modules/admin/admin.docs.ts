import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { PaginatedAuditDto } from "@/shared/dto";

export const GetAuditDoc = () => applyDecorators(
  ApiOperation({ summary: "Audit log", description: "Paginated audit log of all user actions, newest first. Filterable by userId and action type. Admin only." }),
  ApiResponse({ status: 200, type: PaginatedAuditDto }),
  ApiResponse({ status: 403, description: "Admin role required" }),
);

export const TriggerJobDoc = () => applyDecorators(
  ApiOperation({ summary: "Trigger cron job", description: "Manually triggers a background job outside its normal schedule. Admin only." }),
  ApiParam({ name: "job", description: "Job name", enum: ["populate", "news", "trump", "reddit", "threatintel"] }),
  ApiResponse({ status: 201, description: "{ triggered: string, at: string }" }),
  ApiResponse({ status: 400, description: "Unknown job name" }),
  ApiResponse({ status: 403, description: "Admin role required" }),
);
