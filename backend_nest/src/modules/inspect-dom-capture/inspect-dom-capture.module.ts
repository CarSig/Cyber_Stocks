import { Module } from "@nestjs/common";
import { InspectDomCaptureController } from "./inspect-dom-capture.controller";
import { InspectDomCaptureService } from "./inspect-dom-capture.service";
import { AuthService } from "@/modules/auth/auth.service";

@Module({
  controllers: [InspectDomCaptureController],
  providers: [InspectDomCaptureService, AuthService],
})
export class InspectDomCaptureModule {}
