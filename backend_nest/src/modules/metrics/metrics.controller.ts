import { Controller, Get, Header, Res } from "@nestjs/common";
import type { Response } from "express";
import { registry } from "@/shared/metrics";
import { Public } from "@/common/decorators/public.decorator";

@Controller("metrics")
export class MetricsController {
  @Get()
  @Public()
  async getMetrics(@Res() res: Response) {
    res.setHeader("Content-Type", registry.contentType);
    res.send(await registry.metrics());
  }
}
