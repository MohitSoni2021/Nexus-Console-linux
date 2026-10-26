import { z } from 'zod';

export const powerAttributeSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
});

export const powerHistoryPointSchema = z.object({
  timestamp: z.number(),
  value: z.number(),
  state: z.string(),
});

export const powerDeviceSchema = z.object({
  id: z.string(),
  nativePath: z.string(),
  name: z.string(),
  kind: z.string(),
  icon: z.string(),
  isOnline: z.boolean().nullable().optional(),
  state: z.string().nullable().optional(),
  percentage: z.number().nullable().optional(),
  capacityHealth: z.number().nullable().optional(),
  energyWh: z.number().nullable().optional(),
  energyFullWh: z.number().nullable().optional(),
  energyDesignWh: z.number().nullable().optional(),
  rateW: z.number().nullable().optional(),
  voltageV: z.number().nullable().optional(),
  timeToFull: z.string().nullable().optional(),
  timeToEmpty: z.string().nullable().optional(),
  vendor: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serial: z.string().nullable().optional(),
  technology: z.string().nullable().optional(),
  refreshed: z.string().nullable().optional(),
  cycleCount: z.number().nullable().optional(),
  attributes: z.array(powerAttributeSchema),
  chargeHistory: z.array(powerHistoryPointSchema).default([]),
  rateHistory: z.array(powerHistoryPointSchema).default([]),
  voltageHistory: z.array(powerHistoryPointSchema).default([]),
});

export const powerStatisticsSchema = z.object({
  isLaptop: z.boolean(),
  chassisType: z.string(),
  deviceClass: z.string(),
  onBattery: z.boolean(),
  hasBattery: z.boolean(),
  devices: z.array(powerDeviceSchema),
});

export type PowerAttribute = z.infer<typeof powerAttributeSchema>;
export type PowerHistoryPoint = z.infer<typeof powerHistoryPointSchema>;
export type PowerDevice = z.infer<typeof powerDeviceSchema>;
export type PowerStatistics = z.infer<typeof powerStatisticsSchema>;
