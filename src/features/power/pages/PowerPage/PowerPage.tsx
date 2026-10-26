import { useState, useEffect } from 'react';
import { RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { usePowerStatistics } from '../../api/usePowerStatistics';
import { PowerSummaryHero } from '../../components/PowerSummaryHero';
import { PowerDeviceList } from '../../components/PowerDeviceList';
import { PowerDetailsTable } from '../../components/PowerDetailsTable';
import { PowerHistoryChart } from '../../components/PowerHistoryChart';
import { PowerStatisticsView } from '../../components/PowerStatisticsView';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

type ActiveTab = 'details' | 'history' | 'statistics';

export const PowerPage = () => {
  const { data, isPending, isError, error, isFetching, refetch } = usePowerStatistics();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');

  // Auto-select preferred device (battery if present, otherwise line power / first device)
  useEffect(() => {
    if (data?.devices && data.devices.length > 0) {
      if (!selectedDeviceId || !data.devices.some((d) => d.id === selectedDeviceId)) {
        const preferred = data.devices.find((d) => d.kind === 'battery') ?? data.devices[0];
        setSelectedDeviceId(preferred.id);
      }
    }
  }, [data, selectedDeviceId]);

  const selectedDevice = data?.devices.find((d) => d.id === selectedDeviceId) ?? data?.devices[0];

  const subtitle = isPending
    ? 'Detecting hardware power configuration...'
    : data
      ? `${data.deviceClass} · ${data.devices.length} power device${data.devices.length === 1 ? '' : 's'} detected`
      : 'Power & energy diagnostics';

  return (
    <div className="flex h-full flex-col">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-fg">Power Statistics</h1>
            {data && (
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                {data.deviceClass}
              </span>
            )}
          </div>
          <p className="text-sm text-fg-muted">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="min-h-0 flex-1 overflow-auto p-6 xl:p-8">
        {isPending ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-fg-muted">
              Probing power architecture and energy metrics...
            </p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
            <h3 className="mt-2 text-base font-semibold text-fg">
              Failed to read power statistics
            </h3>
            <p className="mt-1 text-sm text-fg-muted">
              {error instanceof Error ? error.message : 'Unknown power diagnostics error'}
            </p>
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        ) : !data || data.devices.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
            <Zap className="h-8 w-8 text-fg-muted" />
            <h3 className="text-sm font-semibold text-fg">No Power Devices Detected</h3>
            <p className="max-w-md text-xs text-fg-muted">
              Neither UPower nor Linux kernel sysfs power supplies were accessible on this machine.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[90rem] flex-col gap-6">
            {/* Summary Cards */}
            <PowerSummaryHero data={data} />

            {/* Two-Column Device & Details Split View */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              {/* Left Column: Device Selector */}
              <div className="rounded-xl border border-border bg-paper p-4 lg:col-span-4 xl:col-span-3">
                <PowerDeviceList
                  devices={data.devices}
                  selectedId={selectedDevice?.id ?? ''}
                  onSelect={setSelectedDeviceId}
                  isLaptop={data.isLaptop}
                />
              </div>

              {/* Right Column: Tabbed Details View */}
              <div className="flex flex-col gap-4 lg:col-span-8 xl:col-span-9">
                {/* Reference-matching Tabs: Details | History | Statistics */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-1 rounded-lg bg-list p-0 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className={cn(
                        'rounded-md px-4 py-2 font-medium transition-colors',
                        activeTab === 'details'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={cn(
                        'rounded-md px-3.5 py-1.5 font-medium transition-colors',
                        activeTab === 'history'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('statistics')}
                      className={cn(
                        'rounded-md px-3.5 py-1.5 font-medium transition-colors',
                        activeTab === 'statistics'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      Statistics
                    </button>
                  </div>

                  {selectedDevice && (
                    <span className="font-mono text-xs text-fg-muted">{selectedDevice.id}</span>
                  )}
                </div>

                {/* Tab Contents */}
                {selectedDevice ? (
                  activeTab === 'details' ? (
                    <PowerDetailsTable device={selectedDevice} />
                  ) : activeTab === 'history' ? (
                    <PowerHistoryChart device={selectedDevice} />
                  ) : (
                    <PowerStatisticsView device={selectedDevice} isLaptop={data.isLaptop} />
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
                    Select a power device to view its details.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
