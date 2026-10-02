export const SENSOR_TYPES = [
  'SOIL_MOISTURE',
  'FLOW_METER',
  'PUMP_MONITOR',
  'WEATHER_STATION',
] as const;
export type SensorType = (typeof SENSOR_TYPES)[number];

export type DeviceStatus = 'ACTIVE' | 'DISABLED';

export interface Reading {
  recordedAt: string;
  soilMoisturePct: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  rainfallMm: number | null;
  flowLpm: number | null;
  volumeLitres: number | null;
  pressureBar: number | null;
  powerKw: number | null;
  vibrationMmS: number | null;
  motorTempC: number | null;
}

export interface Device {
  id: string;
  name: string;
  deviceId: string;
  type: SensorType;
  status: DeviceStatus;
  fieldId: string | null;
  fieldName: string | null;
  assetId: string | null;
  assetName: string | null;
  keyPrefix: string | null;
  keyRotatedAt: string | null;
  lastSeenAt: string | null;
  online: boolean;
  fieldCapacityPct: number | null;
  wiltingPointPct: number | null;
  latest: Reading | null;
  depletionPct: number | null;
  createdAt: string;
}

export interface IssuedKey {
  device: Device;
  deviceKey: string;
}

export interface HourlyReading {
  hour: string;
  samples: number;
  soilMoisturePct: number | null;
  temperatureC: number | null;
  litresPerHour: number | null;
  pressureBar: number | null;
  powerKw: number | null;
  vibrationMmS: number | null;
  motorTempC: number | null;
}

export interface ReadingSeries {
  deviceId: string;
  from: string;
  to: string;
  hours: HourlyReading[];
}

export interface DeviceInput {
  type?: SensorType;
  deviceId?: string;
  name: string | null;
  fieldId: string | null;
  assetId: string | null;
  fieldCapacityPct: number | null;
  wiltingPointPct: number | null;
  status?: DeviceStatus;
}
