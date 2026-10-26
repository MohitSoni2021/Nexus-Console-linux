import {
  BatteryCharging,
  BatteryMedium,
  Cpu,
  Laptop,
  Monitor,
  Plug,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { PowerStatistics } from '../api/power.schema';

interface PowerSummaryHeroProps {
  data: PowerStatistics;
}

export const PowerSummaryHero = ({ data }: PowerSummaryHeroProps) => {
  const { isLaptop, deviceClass, chassisType, hasBattery, devices } = data;
  const battery = devices.find((d) => d.kind === 'battery');
  const acAdapter = devices.find((d) => d.kind === 'line_power');

  const isCharging = battery?.state === 'charging';
  const isOnline = acAdapter?.isOnline ?? false;
  const percentage = battery?.percentage ?? null;
  const capacityHealth = battery?.capacityHealth ?? null;
  const rateW = battery?.rateW ?? null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. System Form Factor */}
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-paper p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {isLaptop ? <Laptop className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wider text-fg-muted uppercase">System Type</p>
          <p className="truncate text-sm font-semibold text-fg">{deviceClass}</p>
          <p className="truncate text-xs text-fg-muted">
            {chassisType ? `Chassis: ${chassisType}` : isLaptop ? 'Portable' : 'Stationary'}
          </p>
        </div>
      </div>

      {/* 2. Primary Power Source */}
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-paper p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Plug className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wider text-fg-muted uppercase">AC Power</p>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            <p className="truncate text-sm font-semibold text-fg">
              {isOnline ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          <p className="truncate text-xs text-fg-muted">
            {isOnline ? 'Drawing AC Mains power' : 'Running on battery'}
          </p>
        </div>
      </div>

      {/* 3. Battery Status or Desktop Notice */}
      {isLaptop && hasBattery ? (
        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-paper p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            {isCharging ? (
              <BatteryCharging className="h-5 w-5 text-emerald-400" />
            ) : (
              <BatteryMedium className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-medium tracking-wider text-fg-muted uppercase">Battery</p>
              {percentage !== null && (
                <span className="text-xs font-bold text-fg tabular-nums">{percentage}%</span>
              )}
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-list">
              <div
                className={`h-full transition-all duration-500 ${
                  isCharging
                    ? 'bg-emerald-500'
                    : (percentage ?? 100) < 20
                      ? 'bg-rose-500'
                      : 'bg-accent'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, percentage ?? 0))}%` }}
              />
            </div>
            <p className="mt-1 truncate text-xs text-fg-muted capitalize">
              {battery?.state ?? 'Normal'}
              {battery?.timeToFull ? ` · ${battery.timeToFull} to full` : ''}
              {battery?.timeToEmpty && !isCharging ? ` · ${battery.timeToEmpty} left` : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-paper p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wider text-fg-muted uppercase">
              Power Delivery
            </p>
            <p className="truncate text-sm font-semibold text-fg">Direct Line Power</p>
            <p className="truncate text-xs text-fg-muted">No internal battery needed</p>
          </div>
        </div>
      )}

      {/* 4. Power Draw / Health */}
      {isLaptop && hasBattery ? (
        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-paper p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wider text-fg-muted uppercase">
              {isCharging ? 'Charge Rate' : 'Discharge Rate'}
            </p>
            <p className="truncate text-sm font-semibold text-fg tabular-nums">
              {rateW !== null && rateW > 0 ? `${rateW.toFixed(1)} W` : '0.0 W'}
            </p>
            <p className="truncate text-xs text-fg-muted">
              {capacityHealth !== null
                ? `Health: ${capacityHealth.toFixed(1)}%`
                : battery?.voltageV
                  ? `${battery.voltageV.toFixed(2)} V`
                  : 'Power Draw'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-paper p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wider text-fg-muted uppercase">
              Power Management
            </p>
            <p className="truncate text-sm font-semibold text-fg">Continuous AC</p>
            <p className="truncate text-xs text-fg-muted">Optimal performance mode</p>
          </div>
        </div>
      )}
    </div>
  );
};
