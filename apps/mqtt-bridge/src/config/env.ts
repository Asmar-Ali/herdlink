export interface MqttBridgeConfig {
  mqttBrokerUrl: string;
  mqttTopic: string;
  kafkaBrokers: string[];
  kafkaClientId: string;
  healthPort: number;
  logLevel: string;
}

const DEFAULTS = {
  MQTT_BROKER_URL: "mqtt://localhost:1883",
  MQTT_TOPIC: "herdlink/telemetry/#",
  KAFKA_BROKERS: "localhost:9092",
  KAFKA_CLIENT_ID: "mqtt-bridge",
  HEALTH_PORT: "3011",
  LOG_LEVEL: "info",
} as const;

function readString(
  env: NodeJS.ProcessEnv,
  key: keyof typeof DEFAULTS,
): string {
  const value = env[key] ?? DEFAULTS[key];
  if (value === "") {
    throw new Error(`Missing or empty required env: ${key}`);
  }
  return value;
}

function readStringList(
  env: NodeJS.ProcessEnv,
  key: keyof typeof DEFAULTS,
): string[] {
  return readString(env, key)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readNumber(
  env: NodeJS.ProcessEnv,
  key: keyof typeof DEFAULTS,
): number {
  const raw = env[key] ?? DEFAULTS[key];
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric env: ${key}=${raw}`);
  }
  return value;
}

export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
): MqttBridgeConfig {
  return {
    mqttBrokerUrl: readString(env, "MQTT_BROKER_URL"),
    mqttTopic: readString(env, "MQTT_TOPIC"),
    kafkaBrokers: readStringList(env, "KAFKA_BROKERS"),
    kafkaClientId: readString(env, "KAFKA_CLIENT_ID"),
    healthPort: readNumber(env, "HEALTH_PORT"),
    logLevel: readString(env, "LOG_LEVEL"),
  };
}
