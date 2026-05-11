if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodeSDK } = require("@opentelemetry/sdk-node") as typeof import("@opentelemetry/sdk-node");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http") as typeof import("@opentelemetry/exporter-trace-otlp-http");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node") as typeof import("@opentelemetry/auto-instrumentations-node");

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "backend-nest",
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();
  process.on("SIGTERM", () => { void sdk.shutdown(); });
}
