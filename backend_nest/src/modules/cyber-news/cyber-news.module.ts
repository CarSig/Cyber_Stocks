import { Module } from "@nestjs/common";
import { CyberNewsController } from "./cyber-news.controller";
import { CyberNewsService } from "./cyber-news.service";
import { CoreDbModule } from "@/shared/core-db.module";

@Module({
  imports: [CoreDbModule],
  controllers: [CyberNewsController],
  providers: [CyberNewsService],
})
export class CyberNewsModule {}
