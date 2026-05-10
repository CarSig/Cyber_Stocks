import pino from "pino";
import fs from "fs";
import path from "path";

const logFile = process.env.LOG_FILE ?? "logs/app.log";
fs.mkdirSync(path.dirname(logFile), { recursive: true });

const streams: pino.StreamEntry[] = [
  { stream: fs.createWriteStream(logFile, { flags: "a" }) as NodeJS.WritableStream },
];

if (process.env.NODE_ENV !== "production") {
  streams.push({ stream: process.stdout });
}

export const logger = pino(
  { level: process.env.LOG_LEVEL ?? "info" },
  pino.multistream(streams),
);
