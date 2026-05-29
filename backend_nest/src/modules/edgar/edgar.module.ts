import { Module } from "@nestjs/common";
import { EdgarController } from "./edgar.controller";
import { EdgarService } from "./edgar.service";
import { SecFilingsRepository } from "./sec-filings.repository";
import { SecBootstrapService } from "./sec-bootstrap.service";
import { EdgarPollerService } from "./edgar-poller.service";

@Module({
  controllers: [EdgarController],
  providers: [EdgarService, SecFilingsRepository, SecBootstrapService, EdgarPollerService],
  exports: [EdgarService, SecFilingsRepository, EdgarPollerService],
})
export class EdgarModule {}
