export interface Position {
  lat: number;
  lng: number;
}

export interface TelemetryMessage {
  deviceId: string;
  herdId: string;
  timestamp: string;
  position: Position;
  batteryLevel: number;
  sequence: number;
  correlationId: string;
}
