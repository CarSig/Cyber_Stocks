import { Module } from "@nestjs/common";
import { SecController } from "./sec.controller";
import { SecService } from "./sec.service";

@Module({
  controllers: [SecController],
  providers: [SecService],
})
export class SecModule {}
