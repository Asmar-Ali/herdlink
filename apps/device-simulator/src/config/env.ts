export interface DeviceSimulatorConfig {
  mqttBrokerUrl: string;
  deviceSerialNumber: string;
  deviceHerdId: string;
  publishIntervalMs: number;
  startLat: number;
  startLng: number;
  walkStepDegrees: number;
  healthPort: number;
  logLevel: string;
}

const DEFAULTS = {
  MQTT_BROKER_URL: "mqtt://localhost:1883",
  DEVICE_SERIAL_NUMBER: "SIM-000001",
  DEVICE_HERD_ID: "herd-demo-1",
  PUBLISH_INTERVAL_MS: "30000",
  START_LAT: "-37.796",
  START_LNG: "144.904",
  WALK_STEP_DEGREES: "0.0001",
  HEALTH_PORT: "3010",
  LOG_LEVEL: "info",
} as const;

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

export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
): DeviceSimulatorConfig {
  return {
    mqttBrokerUrl: readString(env, "MQTT_BROKER_URL"),
    deviceSerialNumber: readString(env, "DEVICE_SERIAL_NUMBER"),
    deviceHerdId: readString(env, "DEVICE_HERD_ID"),
    publishIntervalMs: readNumber(env, "PUBLISH_INTERVAL_MS"),
    startLat: readNumber(env, "START_LAT"),
    startLng: readNumber(env, "START_LNG"),
    walkStepDegrees: readNumber(env, "WALK_STEP_DEGREES"),
    healthPort: readNumber(env, "HEALTH_PORT"),
    logLevel: readString(env, "LOG_LEVEL"),
  };
}
