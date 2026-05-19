import { Controller, Get, Req, Res, VERSION_NEUTRAL } from "@nestjs/common";
import type { Request, Response } from "express";
import { registry } from "@/shared/metrics";
import { Public } from "@/common/decorators/public.decorator";
import { AppError } from "@/shared/errors";

@Controller({ path: "metrics", version: VERSION_NEUTRAL })
export class MetricsController {
  @Get()
  @Public()
  async getMetrics(@Req() req: Request, @Res() res: Response) {
    const ip = req.ip ?? req.socket.remoteAddress ?? "";
    if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "::ffff:127.0.0.1") {
      throw new AppError("Forbidden", 403);
    }
    res.setHeader("Content-Type", registry.contentType);
    res.send(await registry.metrics());
  }
}
