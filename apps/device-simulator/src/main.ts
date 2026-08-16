import "./instrument.js";
import { createServer } from "node:http";
import { createLogger, shutdownTracing } from "@herdlink/observability";
import { validateEnv } from "./config/env.js";
import { MqttPublisher } from "./mqtt/mqtt-publisher.js";
import { Simulator } from "./simulator.js";

const SERVICE_NAME = "device-simulator";

function main(): void {
  const config = validateEnv();
  const logger = createLogger({
    serviceName: SERVICE_NAME,
    level: config.logLevel,
  });

  const publisher = new MqttPublisher({
    brokerUrl: config.mqttBrokerUrl,
    clientId: `device-simulator-${config.deviceSerialNumber}`,
    logger,
  });

  const simulator = new Simulator({
    deviceId: config.deviceSerialNumber,
    herdId: config.deviceHerdId,
    startPosition: { lat: config.startLat, lng: config.startLng },
    stepDegrees: config.walkStepDegrees,
    intervalMs: config.publishIntervalMs,
    publisher,
    logger,
  });

  const healthServer = createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404);
      res.end();
      return;
    }

    const healthy = publisher.isConnected();
    res.writeHead(healthy ? 200 : 503, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ status: healthy ? "ok" : "unhealthy" }));
  });

  healthServer.listen(config.healthPort, () => {
    logger.info({ port: config.healthPort }, "health server listening");
  });

  simulator.start();
  logger.info(
    { deviceId: config.deviceSerialNumber },
    "device-simulator started",
  );

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    simulator.stop();
    healthServer.close();

    void (async () => {
      try {
        await publisher.close();
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

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "unhandled rejection");
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaught exception");
    process.exit(1);
  });
}

main();
