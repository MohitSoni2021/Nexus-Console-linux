import { Battery, BatteryCharging, Plug, Mouse, Keyboard, HardDrive, Monitor } from 'lucide-react';
import type { PowerDevice } from '../api/power.schema';
import { cn } from '@/shared/lib/cn';

interface PowerDeviceListProps {
  devices: PowerDevice[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLaptop: boolean;
}

export const PowerDeviceList = ({
  devices,
  selectedId,
  onSelect,
  isLaptop,
}: PowerDeviceListProps) => {
  const getDeviceIcon = (dev: PowerDevice) => {
    if (dev.kind === 'line_power') {
      return <Plug className="h-4 w-4 shrink-0" />;
    }
    if (dev.kind === 'battery') {
      if (dev.state === 'charging') {
        return <BatteryCharging className="h-4 w-4 shrink-0 text-emerald-400" />;
      }
      return <Battery className="h-4 w-4 shrink-0" />;
    }
    const lower = dev.name.toLowerCase();
    if (lower.includes('mouse')) return <Mouse className="h-4 w-4 shrink-0" />;
    if (lower.includes('keyboard')) return <Keyboard className="h-4 w-4 shrink-0" />;
    if (lower.includes('ups')) return <HardDrive className="h-4 w-4 shrink-0" />;
    return <Monitor className="h-4 w-4 shrink-0" />;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-2 pb-1 text-xs font-medium tracking-wider text-fg-muted uppercase">
        Power Devices
      </p>

      {devices.map((device) => {
        const isSelected = device.id === selectedId;
        const icon = getDeviceIcon(device);

        return (
          <button
            key={device.id}
            type="button"
            onClick={() => onSelect(device.id)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
              isSelected
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:bg-list hover:text-fg',
            )}
          >
            {icon}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'truncate text-sm font-medium',
                  isSelected ? 'text-white' : 'text-fg',
                )}
              >
                {device.name}
              </p>
            </div>
            {device.percentage !== null && device.percentage !== undefined && (
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  isSelected ? 'text-white/90' : 'text-fg-muted',
                )}
              >
                {device.percentage.toFixed(0)}%
              </span>
            )}
            {device.kind === 'line_power' && device.isOnline && (
              <span
                className={cn('h-2 w-2 rounded-full', isSelected ? 'bg-white' : 'bg-emerald-500')}
                title="Online"
              />
            )}
          </button>
        );
      })}

      {!isLaptop && devices.every((d) => d.kind !== 'battery') && (
        <div className="mt-3 rounded-lg border border-border/60 bg-list/50 p-3 text-xs text-fg-muted">
          <p className="font-medium text-fg">Desktop Workstation</p>
          <p className="mt-1">
            Running directly on AC line power. No internal batteries detected or needed.
          </p>
        </div>
      )}
    </div>
  );
};
