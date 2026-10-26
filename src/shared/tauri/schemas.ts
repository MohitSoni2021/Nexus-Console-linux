import { z } from 'zod';

/** Mirrors Rust `AppContext` (serde camelCase). brew* are null when Homebrew
 * isn't found. This schema is the drift guard between Rust and TS. */
export const appContextSchema = z.object({
  platform: z.string(),
  arch: z.string(),
  brewPrefix: z.string().nullable(),
  brewBin: z.string().nullable(),
  brewVersion: z.string().nullable(),
});
export type AppContext = z.infer<typeof appContextSchema>;

/** Mirrors Rust `AppError` serialization. */
export const appErrorSchema = z.object({
  kind: z.enum(['shell', 'parse', 'invalidName', 'forbidden', 'notFound', 'io']),
  message: z.string(),
  detail: z.string().optional(),
});

export const osInfoSchema = z.object({
  name: z.string(),
  prettyName: z.string(),
  version: z.string(),
  id: z.string(),
  kernel: z.string(),
  arch: z.string(),
  hostname: z.string(),
  uptimeSeconds: z.number(),
  uptimeFormatted: z.string(),
});

export const hardwareInfoSchema = z.object({
  vendor: z.string(),
  productName: z.string(),
  productFamily: z.string(),
  boardVendor: z.string(),
  boardName: z.string(),
  biosVendor: z.string(),
  biosVersion: z.string(),
  biosDate: z.string(),
  chassisType: z.string(),
});

export const cpuInfoSchema = z.object({
  modelName: z.string(),
  vendorId: z.string(),
  cores: z.number(),
  threads: z.number(),
  mhzCurrent: z.number().nullable().optional(),
  mhzMax: z.number().nullable().optional(),
  mhzMin: z.number().nullable().optional(),
  l1dCache: z.string().nullable().optional(),
  l1iCache: z.string().nullable().optional(),
  l2Cache: z.string().nullable().optional(),
  l3Cache: z.string().nullable().optional(),
  flagsSummary: z.array(z.string()),
});

export const ramSlotInfoSchema = z.object({
  locator: z.string(),
  bankLocator: z.string().nullable().optional(),
  size: z.string(),
  slotType: z.string(),
  speed: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  partNumber: z.string().nullable().optional(),
  status: z.string(),
});

export const memoryInfoSchema = z.object({
  totalBytes: z.number(),
  freeBytes: z.number(),
  availableBytes: z.number(),
  usedBytes: z.number(),
  usedPercent: z.number(),
  buffersBytes: z.number(),
  cachedBytes: z.number(),
  swapTotalBytes: z.number(),
  swapFreeBytes: z.number(),
  swapUsedBytes: z.number(),
  swapUsedPercent: z.number(),
  memoryBlocksCount: z.number(),
  memoryBlockSizeBytes: z.number(),
  ramSlots: z.array(ramSlotInfoSchema),
  slotSummary: z.string(),
});

export const diskPartitionSchema = z.object({
  name: z.string(),
  sizeBytes: z.number(),
  sizeFormatted: z.string(),
  fstype: z.string().nullable().optional(),
  mountpoint: z.string().nullable().optional(),
  usedBytes: z.number().nullable().optional(),
  availBytes: z.number().nullable().optional(),
  usedPercent: z.number().nullable().optional(),
});

export const diskDeviceSchema = z.object({
  name: z.string(),
  model: z.string().nullable().optional(),
  sizeBytes: z.number(),
  sizeFormatted: z.string(),
  diskType: z.string(),
  rotational: z.boolean(),
  state: z.string().nullable().optional(),
  partitions: z.array(diskPartitionSchema),
});

export const gpuInfoSchema = z.object({
  name: z.string(),
  vendor: z.string(),
  pciId: z.string().nullable().optional(),
});

export const networkInterfaceSchema = z.object({
  name: z.string(),
  isUp: z.boolean(),
  isWireless: z.boolean(),
  macAddress: z.string().nullable().optional(),
  mtu: z.number().nullable().optional(),
});

export const systemStatsSchema = z.object({
  os: osInfoSchema,
  hardware: hardwareInfoSchema,
  cpu: cpuInfoSchema,
  memory: memoryInfoSchema,
  disks: z.array(diskDeviceSchema),
  gpus: z.array(gpuInfoSchema),
  network: z.array(networkInterfaceSchema),
});

export type SystemStats = z.infer<typeof systemStatsSchema>;
