import { test, expect } from 'vitest';
import { powerStatisticsSchema } from './power.schema';

test('parses laptop power statistics with AC adapter and battery', () => {
  const raw = {
    isLaptop: true,
    chassisType: 'Notebook',
    deviceClass: 'Laptop',
    onBattery: false,
    hasBattery: true,
    devices: [
      {
        id: 'line_power_ACAD',
        nativePath: 'ACAD',
        name: 'AC adapter',
        kind: 'line_power',
        icon: 'ac-adapter',
        isOnline: true,
        attributes: [
          { key: 'device', label: 'Device', value: 'line_power_ACAD' },
          { key: 'type', label: 'Type', value: 'AC adapter' },
          { key: 'online', label: 'Online', value: 'Yes' },
        ],
        chargeHistory: [],
        rateHistory: [],
        voltageHistory: [],
      },
      {
        id: 'battery_BAT1',
        nativePath: 'BAT1',
        name: 'Laptop battery',
        kind: 'battery',
        icon: 'battery-charging',
        percentage: 42.0,
        capacityHealth: 81.6,
        state: 'charging',
        energyWh: 20.5,
        energyFullWh: 49.0,
        energyDesignWh: 60.0,
        rateW: 34.0,
        voltageV: 15.9,
        vendor: 'Sunwoda',
        model: 'L23D4PK4',
        serial: '1125',
        attributes: [
          { key: 'device', label: 'Device', value: 'battery_BAT1' },
          { key: 'type', label: 'Type', value: 'Laptop battery' },
          { key: 'vendor', label: 'Vendor', value: 'Sunwoda' },
          { key: 'percentage', label: 'Percentage', value: '42.0%' },
        ],
        chargeHistory: [{ timestamp: 1792994607, value: 42.0, state: 'charging' }],
        rateHistory: [],
        voltageHistory: [],
      },
    ],
  };

  const parsed = powerStatisticsSchema.parse(raw);
  expect(parsed.isLaptop).toBe(true);
  expect(parsed.devices).toHaveLength(2);
  expect(parsed.devices[1].percentage).toBe(42.0);
});

test('parses desktop PC power statistics without battery', () => {
  const raw = {
    isLaptop: false,
    chassisType: 'Desktop',
    deviceClass: 'Desktop PC',
    onBattery: false,
    hasBattery: false,
    devices: [
      {
        id: 'line_power_ACAD',
        nativePath: 'ACAD',
        name: 'AC adapter',
        kind: 'line_power',
        icon: 'ac-adapter',
        isOnline: true,
        attributes: [
          { key: 'device', label: 'Device', value: 'line_power_ACAD' },
          { key: 'type', label: 'Type', value: 'AC adapter' },
        ],
      },
    ],
  };

  const parsed = powerStatisticsSchema.parse(raw);
  expect(parsed.isLaptop).toBe(false);
  expect(parsed.hasBattery).toBe(false);
  expect(parsed.deviceClass).toBe('Desktop PC');
});
