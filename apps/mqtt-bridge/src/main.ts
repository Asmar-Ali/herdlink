import "./instrument.js";
import { createServer } from "node:http";
import { createLogger, shutdownTracing } from "@herdlink/observability";
import { validateEnv } from "./config/env.js";
import { TelemetryProducer } from "./kafka/telemetry-producer.js";
import { Bridge } from "./bridge.js";

const SERVICE_NAME = "mqtt-bridge";

async function main(): Promise<void> {
  const config = validateEnv();
  const logger = createLogger({
    serviceName: SERVICE_NAME,
    level: config.logLevel,
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "unhandled rejection");
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaught exception");
    process.exit(1);
  });

  const producer = new TelemetryProducer({
    brokers: config.kafkaBrokers,
    clientId: config.kafkaClientId,
    logger,
  });

  await producer.connect();

  const bridge = new Bridge({
    producer,
    subscriberOptions: {
      brokerUrl: config.mqttBrokerUrl,
      clientId: config.kafkaClientId,
      topic: config.mqttTopic,
      logger,
    },
  });

  const healthServer = createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404);
      res.end();
      return;
    }

    const healthy = bridge.isHealthy();
    res.writeHead(healthy ? 200 : 503, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ status: healthy ? "ok" : "unhealthy" }));
  });

  healthServer.listen(config.healthPort, () => {
    logger.info({ port: config.healthPort }, "health server listening");
  });

  logger.info(
    { topic: config.mqttTopic, brokers: config.kafkaBrokers },
    "mqtt-bridge started",
  );

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    healthServer.close();

    void (async () => {
      try {
        await bridge.close();
        await shutdownTracing();
      } catch (error) {
        logger.error({ err: error }, "error during shutdown");
      } finally {
        process.exit(0);
      }
    })();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  process.stderr.write(`mqtt-bridge failed to start: ${String(error)}\n`);
  process.exit(1);
});
