import { ShieldCheck, BatteryWarning, Cpu, RefreshCw } from 'lucide-react';
import type { PowerDevice } from '../api/power.schema';

interface PowerStatisticsViewProps {
  device: PowerDevice;
  isLaptop: boolean;
}

export const PowerStatisticsView = ({ device, isLaptop }: PowerStatisticsViewProps) => {
  const isBattery = device.kind === 'battery';

  if (!isBattery) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-paper p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fg">Continuous Line Power Diagnostics</h3>
            <p className="text-xs text-fg-muted">AC Mains adapter statistics</p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-list/60 p-4">
            <p className="text-xs text-fg-muted uppercase">Power Delivery</p>
            <p className="text-base font-semibold text-fg">Direct Mains</p>
            <p className="mt-1 text-xs text-fg-muted">
              Continuous wall power without battery buffering
            </p>
          </div>
          <div className="rounded-lg bg-list/60 p-4">
            <p className="text-xs text-fg-muted uppercase">Connection State</p>
            <p className="text-base font-semibold text-emerald-400">
              {device.isOnline ? 'Online · Active' : 'Offline'}
            </p>
            <p className="mt-1 text-xs text-fg-muted">Supply line active</p>
          </div>
          <div className="rounded-lg bg-list/60 p-4">
            <p className="text-xs text-fg-muted uppercase">Health Impact</p>
            <p className="text-base font-semibold text-fg">Zero Wear</p>
            <p className="mt-1 text-xs text-fg-muted">No battery cells to degrade over cycles</p>
          </div>
        </div>
      </div>
    );
  }

  const health = device.capacityHealth ?? 100;
  const designWh = device.energyDesignWh ?? 0;
  const fullWh = device.energyFullWh ?? 0;
  const wearPct = designWh > 0 ? Math.max(0, ((designWh - fullWh) / designWh) * 100) : 0;
  const cycles = device.cycleCount ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Capacity & Health Card */}
        <div className="rounded-xl border border-border bg-paper p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-fg-muted uppercase">Battery Health</p>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg tabular-nums">{health.toFixed(1)}%</p>
          <p className="text-xs text-fg-muted">Maximum capacity relative to design</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-list">
            <div
              className={`h-full ${health > 80 ? 'bg-emerald-500' : health > 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
            />
          </div>
        </div>

        {/* Degradation / Wear Card */}
        <div className="rounded-xl border border-border bg-paper p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-fg-muted uppercase">Cell Degradation</p>
            <BatteryWarning className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg tabular-nums">{wearPct.toFixed(1)}%</p>
          <p className="text-xs text-fg-muted">
            {designWh > 0
              ? `${(designWh - fullWh).toFixed(1)} Wh lost from original`
              : 'Capacity delta'}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-fg-muted tabular-nums">
            <span>Design: {designWh.toFixed(1)} Wh</span>
            <span>Current: {fullWh.toFixed(1)} Wh</span>
          </div>
        </div>

        {/* Charge Cycles Card */}
        <div className="rounded-xl border border-border bg-paper p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-fg-muted uppercase">Cycle Count</p>
            <RefreshCw className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg tabular-nums">
            {cycles > 0 ? cycles.toLocaleString() : 'N/A'}
          </p>
          <p className="text-xs text-fg-muted">Full discharge/charge cycle equivalents</p>
          <p className="mt-3 text-xs text-fg-muted">
            {cycles > 1000
              ? 'High cycle count · normal cell wear'
              : cycles > 500
                ? 'Moderate cycle count'
                : 'Low cycle count · pristine condition'}
          </p>
        </div>
      </div>

      {/* Hardware Profile Details */}
      <div className="rounded-xl border border-border bg-paper p-5">
        <h4 className="text-sm font-semibold text-fg">Hardware Specifications</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-lg bg-list/50 p-3">
            <span className="text-fg-muted">Chemistry</span>
            <p className="mt-1 font-medium text-fg">{device.technology ?? 'Lithium Polymer'}</p>
          </div>
          <div className="rounded-lg bg-list/50 p-3">
            <span className="text-fg-muted">Manufacturer</span>
            <p className="mt-1 font-medium text-fg">{device.vendor ?? 'OEM'}</p>
          </div>
          <div className="rounded-lg bg-list/50 p-3">
            <span className="text-fg-muted">Model ID</span>
            <p className="mt-1 font-mono text-fg">{device.model ?? 'System Battery'}</p>
          </div>
          <div className="rounded-lg bg-list/50 p-3">
            <span className="text-fg-muted">Serial Number</span>
            <p className="mt-1 font-mono text-fg">{device.serial ?? 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-list/50 p-3">
            <span className="text-fg-muted">Voltage Output</span>
            <p className="mt-1 font-medium text-fg tabular-nums">
              {device.voltageV ? `${device.voltageV.toFixed(2)} V` : 'N/A'}
            </p>
          </div>
          <div className="rounded-lg bg-list/50 p-3">
            <span className="text-fg-muted">Device Class</span>
            <p className="mt-1 font-medium text-fg">
              {isLaptop ? 'Mobile Notebook Battery' : 'Stationary UPS Battery'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
