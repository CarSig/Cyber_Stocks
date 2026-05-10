import { Module } from "@nestjs/common";
import { RedditController } from "./reddit.controller";
import { RedditService } from "./reddit.service";

@Module({
  controllers: [RedditController],
  providers: [RedditService],
})
export class RedditModule {}
