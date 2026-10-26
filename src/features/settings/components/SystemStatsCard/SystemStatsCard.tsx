import {
  Cpu,
  HardDrive,
  Layers,
  MemoryStick,
  Monitor,
  Network,
  RefreshCw,
  Server,
  Terminal,
} from 'lucide-react';
import { useAppContext } from '@/shared/tauri';
import { useSystemStats } from '@/features/settings/api/useSystemStats';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { cn } from '@/shared/lib/cn';

function formatBytes(bytes: number): string {
  const kib = 1024;
  const mib = kib * 1024;
  const gib = mib * 1024;
  const tib = gib * 1024;

  if (bytes >= tib) return `${(bytes / tib).toFixed(2)} TB`;
  if (bytes >= gib) return `${(bytes / gib).toFixed(1)} GB`;
  if (bytes >= mib) return `${Math.round(bytes / mib)} MB`;
  return `${Math.round(bytes / kib)} KB`;
}

export const SystemStatsCard = () => {
  const { data: context } = useAppContext();
  const isLinux = context?.platform === 'linux';

  const { data: stats, isLoading, isFetching, refetch } = useSystemStats(isLinux);

  // If the user's OS is not Linux, hide this section entirely
  if (!isLinux) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-paper p-5 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-fg">Linux System &amp; Hardware Stats</h2>
              {stats?.os.prettyName && (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                  {stats.os.prettyName}
                </span>
              )}
            </div>
            <p className="text-xs text-fg-muted">
              Deep hardware-level architecture, memory slots, disk partitions, and kernel
              diagnostics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stats?.os.uptimeFormatted && (
            <span className="text-xs text-fg-muted">
              Uptime: <strong className="text-fg">{stats.os.uptimeFormatted}</strong>
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            title="Refresh hardware stats"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2">
          <Spinner />
          <p className="text-xs text-fg-muted">Probing hardware and Linux sysfs…</p>
        </div>
      ) : !stats ? (
        <div className="py-8 text-center text-xs text-fg-muted">
          Unable to query system statistics. Ensure system read permissions are granted.
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {/* Bento row 1: System info & CPU */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* System / Motherboard */}
            <div className="bg-surface rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Terminal className="h-4 w-4 text-accent" />
                Motherboard &amp; System Firmware
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-fg-muted">Manufacturer:</span>
                  <p className="font-medium text-fg">{stats.hardware.vendor}</p>
                </div>
                <div>
                  <span className="text-fg-muted">Product / Model:</span>
                  <p className="font-medium text-fg">{stats.hardware.productName}</p>
                </div>
                <div>
                  <span className="text-fg-muted">Product Family:</span>
                  <p className="font-medium text-fg">{stats.hardware.productFamily}</p>
                </div>
                <div>
                  <span className="text-fg-muted">Chassis:</span>
                  <p className="font-medium text-fg">{stats.hardware.chassisType}</p>
                </div>
                <div>
                  <span className="text-fg-muted">Motherboard:</span>
                  <p className="font-medium text-fg">
                    {stats.hardware.boardVendor} · {stats.hardware.boardName}
                  </p>
                </div>
                <div>
                  <span className="text-fg-muted">BIOS Version:</span>
                  <p className="font-medium text-fg">
                    {stats.hardware.biosVersion} ({stats.hardware.biosDate})
                  </p>
                </div>
                <div className="col-span-2 border-t border-border pt-2">
                  <span className="text-fg-muted">Kernel &amp; Architecture:</span>
                  <p className="font-mono text-[11px] text-fg">
                    Linux {stats.os.kernel} ({stats.os.arch}) · {stats.os.hostname}
                  </p>
                </div>
              </div>
            </div>

            {/* Processor (CPU) */}
            <div className="bg-surface rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Cpu className="h-4 w-4 text-running" />
                  Processor (CPU)
                </div>
                <span className="rounded bg-running-soft px-2 py-0.5 text-xs font-semibold text-running">
                  {stats.cpu.cores} Cores / {stats.cpu.threads} Threads
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-medium text-fg">{stats.cpu.modelName}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded border border-border bg-paper p-2">
                    <span className="block text-[10px] text-fg-muted">Current Clock</span>
                    <strong className="text-fg">
                      {stats.cpu.mhzCurrent
                        ? `${(stats.cpu.mhzCurrent / 1000).toFixed(2)} GHz`
                        : '—'}
                    </strong>
                  </div>
                  <div className="rounded border border-border bg-paper p-2">
                    <span className="block text-[10px] text-fg-muted">Max Frequency</span>
                    <strong className="text-fg">
                      {stats.cpu.mhzMax ? `${(stats.cpu.mhzMax / 1000).toFixed(2)} GHz` : '—'}
                    </strong>
                  </div>
                  <div className="rounded border border-border bg-paper p-2">
                    <span className="block text-[10px] text-fg-muted">Min Frequency</span>
                    <strong className="text-fg">
                      {stats.cpu.mhzMin ? `${(stats.cpu.mhzMin / 1000).toFixed(2)} GHz` : '—'}
                    </strong>
                  </div>
                </div>

                {/* Caches */}
                {(stats.cpu.l1dCache || stats.cpu.l2Cache || stats.cpu.l3Cache) && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="text-fg-muted">Cache:</span>
                    {stats.cpu.l1dCache && (
                      <span className="rounded border border-border bg-paper px-1.5 py-0.5 font-mono text-fg">
                        {stats.cpu.l1dCache}
                      </span>
                    )}
                    {stats.cpu.l1iCache && (
                      <span className="rounded border border-border bg-paper px-1.5 py-0.5 font-mono text-fg">
                        {stats.cpu.l1iCache}
                      </span>
                    )}
                    {stats.cpu.l2Cache && (
                      <span className="rounded border border-border bg-paper px-1.5 py-0.5 font-mono text-fg">
                        {stats.cpu.l2Cache}
                      </span>
                    )}
                    {stats.cpu.l3Cache && (
                      <span className="rounded border border-border bg-paper px-1.5 py-0.5 font-mono text-fg">
                        {stats.cpu.l3Cache}
                      </span>
                    )}
                  </div>
                )}

                {/* Feature flags */}
                {stats.cpu.flagsSummary.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {stats.cpu.flagsSummary.map((f) => (
                      <span
                        key={f}
                        className="bg-surface-raised rounded px-1.5 py-0.5 text-[10px] font-medium text-fg-muted"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bento row 2: Memory & RAM Slots */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <MemoryStick className="h-4 w-4 text-accent" />
                Physical Memory &amp; RAM Slots
              </div>
              <span className="text-xs font-medium text-fg-muted">{stats.memory.slotSummary}</span>
            </div>

            {/* RAM Progress & Metrics */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-paper p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg">System RAM Usage</span>
                  <span className="font-semibold text-fg">{stats.memory.usedPercent}%</span>
                </div>
                <div className="bg-surface mt-2 h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      stats.memory.usedPercent > 85
                        ? 'bg-danger'
                        : stats.memory.usedPercent > 65
                          ? 'bg-warn'
                          : 'bg-accent',
                    )}
                    style={{ width: `${Math.min(100, stats.memory.usedPercent)}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-fg-muted">
                  <span>
                    Used: <strong className="text-fg">{formatBytes(stats.memory.usedBytes)}</strong>
                  </span>
                  <span>
                    Available:{' '}
                    <strong className="text-fg">{formatBytes(stats.memory.availableBytes)}</strong>
                  </span>
                  <span>
                    Total:{' '}
                    <strong className="text-fg">{formatBytes(stats.memory.totalBytes)}</strong>
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-paper p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg">Swap Space</span>
                  <span className="font-semibold text-fg">{stats.memory.swapUsedPercent}%</span>
                </div>
                <div className="bg-surface mt-2 h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-running transition-all duration-300"
                    style={{ width: `${Math.min(100, stats.memory.swapUsedPercent)}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-fg-muted">
                  <span>
                    Swap Used:{' '}
                    <strong className="text-fg">{formatBytes(stats.memory.swapUsedBytes)}</strong>
                  </span>
                  <span>
                    Swap Free:{' '}
                    <strong className="text-fg">{formatBytes(stats.memory.swapFreeBytes)}</strong>
                  </span>
                  <span>
                    Total Swap:{' '}
                    <strong className="text-fg">{formatBytes(stats.memory.swapTotalBytes)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* RAM Slots breakdown */}
            <div className="mt-4">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-fg">
                <Layers className="h-3.5 w-3.5 text-fg-muted" />
                Hardware Memory Array &amp; Slots Architecture
              </h4>

              {stats.memory.ramSlots.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.memory.ramSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-lg border p-3 text-xs',
                        slot.status === 'Empty'
                          ? 'bg-surface/50 border-dashed border-border text-fg-muted'
                          : 'border-border bg-paper text-fg shadow-xs',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg">{slot.locator}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                            slot.status === 'Empty'
                              ? 'bg-surface text-fg-muted'
                              : 'bg-running-soft text-running',
                          )}
                        >
                          {slot.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-fg">{slot.size}</p>
                      <div className="mt-2 space-y-0.5 text-[11px] text-fg-muted">
                        <p>
                          Type: <span className="text-fg">{slot.slotType}</span>
                        </p>
                        {slot.speed && (
                          <p>
                            Speed: <span className="text-fg">{slot.speed}</span>
                          </p>
                        )}
                        {slot.manufacturer && (
                          <p>
                            Brand: <span className="text-fg">{slot.manufacturer}</span>
                          </p>
                        )}
                        {slot.partNumber && (
                          <p className="font-mono text-[10px]">Part: {slot.partNumber}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-paper p-3 text-xs text-fg-muted">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-fg">
                      Kernel Memory Architecture: {stats.memory.memoryBlocksCount} online memory
                      blocks
                    </span>
                    <span className="font-mono text-[11px] text-fg">
                      {formatBytes(stats.memory.memoryBlockSizeBytes)} per block
                    </span>
                  </div>
                  <p className="mt-1 text-[11px]">
                    Total capacity of {formatBytes(stats.memory.totalBytes)} is dynamically mapped
                    across system channels. Detailed physical socket DIMM serialization requires
                    elevated root permissions to query raw SMBIOS tables.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bento row 3: Storage & Disks */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold text-fg">
              <HardDrive className="h-4 w-4 text-running" />
              Storage Disks &amp; Partitions ({stats.disks.length} physical drives)
            </div>

            <div className="mt-3 space-y-3">
              {stats.disks.map((disk) => (
                <div key={disk.name} className="rounded-lg border border-border bg-paper p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-accent" />
                      <span className="font-mono text-sm font-semibold text-fg">{disk.name}</span>
                      {disk.model && (
                        <span className="text-xs font-medium text-fg-muted">· {disk.model}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-surface rounded px-2 py-0.5 font-medium text-fg">
                        {disk.diskType}
                      </span>
                      <span className="font-semibold text-fg">{disk.sizeFormatted}</span>
                    </div>
                  </div>

                  {disk.partitions.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {disk.partitions.map((part) => (
                        <div
                          key={part.name}
                          className="bg-surface rounded border border-border p-2 text-xs"
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-semibold text-fg">{part.name}</span>
                            <span className="text-fg-muted">{part.sizeFormatted}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-fg-muted">
                            <span>
                              {part.fstype ?? 'raw'} {part.mountpoint && `→ ${part.mountpoint}`}
                            </span>
                            {part.usedPercent !== null && part.usedPercent !== undefined && (
                              <span className="font-medium text-fg">{part.usedPercent}% used</span>
                            )}
                          </div>
                          {part.usedPercent !== null && part.usedPercent !== undefined && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  part.usedPercent > 90 ? 'bg-danger' : 'bg-accent',
                                )}
                                style={{ width: `${Math.min(100, part.usedPercent)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bento row 4: Graphics & Network */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* GPUs */}
            <div className="bg-surface rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Monitor className="h-4 w-4 text-accent" />
                Graphics Adapters (GPU)
              </div>
              {stats.gpus.length > 0 ? (
                <div className="space-y-2">
                  {stats.gpus.map((gpu, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded border border-border bg-paper p-2.5 text-xs"
                    >
                      <div>
                        <p className="font-medium text-fg">{gpu.name}</p>
                        {gpu.pciId && (
                          <span className="font-mono text-[10px] text-fg-muted">
                            PCI: {gpu.pciId}
                          </span>
                        )}
                      </div>
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        {gpu.vendor}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">Standard Linux Display Adapter</p>
              )}
            </div>

            {/* Network Interfaces */}
            <div className="bg-surface rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Network className="h-4 w-4 text-running" />
                Network Interfaces
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {stats.network.slice(0, 6).map((net) => (
                  <div
                    key={net.name}
                    className="flex items-center justify-between rounded border border-border bg-paper p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          net.isUp ? 'bg-running' : 'bg-fg-muted/40',
                        )}
                      />
                      <div>
                        <span className="font-mono font-medium text-fg">{net.name}</span>
                        <span className="block text-[10px] text-fg-muted">
                          {net.isWireless ? 'Wi-Fi' : 'Ethernet/Bridge'}
                        </span>
                      </div>
                    </div>
                    {net.macAddress && (
                      <span className="font-mono text-[10px] text-fg-muted">{net.macAddress}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
