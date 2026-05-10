import { Global, Module } from "@nestjs/common";
import { CoreDbService } from "./core-db.service";

@Global()
@Module({
  providers: [CoreDbService],
  exports: [CoreDbService],
})
export class CoreDbModule {}
