import { Module } from "@nestjs/common";
import { ThreatIntelController } from "./threat-intel.controller";
import { KevThreatIntelService } from "./KevThreatIntelService";
import { NvdThreatIntelService } from "./NvdThreatIntelService";
import { OtxThreatIntelService } from "./OtxThreatIntelService";
import { MispThreatIntelService } from "./MispThreatIntelService";
import { KevClient } from "@/shared/clients/KevClient";
import { NvdClient } from "@/shared/clients/NvdClient";
import { OtxClient } from "@/shared/clients/OtxClient";
import { MispClient } from "@/shared/clients/MispClient";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { CoreDbService } from "@/shared/core-db.service";
import { CoreDbModule } from "@/shared/core-db.module";
import { CacheService } from "@/shared/cache.service";

@Module({
  imports: [CoreDbModule],
  controllers: [ThreatIntelController],
  providers: [
    {
      provide: "KEV_INTEL",
      useFactory: (db: CoreDbService, cache: CacheService) =>
        new KevThreatIntelService(new KevClient(), (name) => new CybersecurityConsumer(name, db.pool), cache),
      inject: [CoreDbService, CacheService],
    },
    {
      provide: "NVD_INTEL",
      useFactory: (db: CoreDbService, cache: CacheService) =>
        new NvdThreatIntelService(new NvdClient(), (name) => new CybersecurityConsumer(name, db.pool), cache),
      inject: [CoreDbService, CacheService],
    },
    {
      provide: "OTX_INTEL",
      useFactory: (db: CoreDbService, cache: CacheService) =>
        new OtxThreatIntelService(new OtxClient(), (name) => new CybersecurityConsumer(name, db.pool), cache),
      inject: [CoreDbService, CacheService],
    },
    {
      provide: "MISP_INTEL",
      useFactory: (db: CoreDbService) =>
        new MispThreatIntelService(new MispClient(), (name) => new CybersecurityConsumer(name, db.pool)),
      inject: [CoreDbService],
    },
  ],
  exports: ["KEV_INTEL", "NVD_INTEL", "OTX_INTEL", "MISP_INTEL"],
})
export class ThreatIntelModule {}
