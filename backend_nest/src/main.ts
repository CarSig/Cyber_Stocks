import { Logger as NestLogger } from "@nestjs/common";
const startupLogger = new NestLogger("Bootstrap");
startupLogger.log("main.ts loaded");
import "./tracing";
import "reflect-metadata";
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 50;
import "dotenv/config";
import { validateEnv } from "./config/env";
validateEnv();
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    defaultIntegrations: false,
  });
}

import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";
import { setupSwagger } from "./config/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(compression());
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  app.setGlobalPrefix("api", { exclude: ["health", "metrics"] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? "http://localhost:5173").split(",").map(o => o.trim());
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  setupSwagger(app);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  startupLogger.log(`Server running on http://localhost:${port}`);
  startupLogger.log(`API docs at http://localhost:${port}/api-docs`);
}

bootstrap().catch((err: unknown) => {
  startupLogger.error(`Failed to start: ${(err as Error).message}`);
  process.exit(1);
});
