import { Module } from "@nestjs/common";
import { EdgarController } from "./edgar.controller";
import { EdgarService } from "./edgar.service";

@Module({
  controllers: [EdgarController],
  providers: [EdgarService],
})
export class EdgarModule {}
