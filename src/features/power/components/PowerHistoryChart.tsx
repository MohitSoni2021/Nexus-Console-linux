import { useState, useMemo } from 'react';
import type { PowerDevice, PowerHistoryPoint } from '../api/power.schema';
import { cn } from '@/shared/lib/cn';

interface PowerHistoryChartProps {
  device: PowerDevice;
}

type MetricType = 'charge' | 'rate' | 'voltage';

export const PowerHistoryChart = ({ device }: PowerHistoryChartProps) => {
  const [metric, setMetric] = useState<MetricType>('charge');

  const historyPoints: PowerHistoryPoint[] = useMemo(() => {
    switch (metric) {
      case 'charge':
        return device.chargeHistory;
      case 'rate':
        return device.rateHistory;
      case 'voltage':
        return device.voltageHistory;
    }
  }, [device, metric]);

  const unit = metric === 'charge' ? '%' : metric === 'rate' ? 'W' : 'V';

  const stats = useMemo(() => {
    if (historyPoints.length === 0) return null;
    const values = historyPoints.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const current = values[0] ?? 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, max, current, avg };
  }, [historyPoints]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Power Metrics History</h3>
          <p className="text-xs text-fg-muted">Recorded progression over time</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-list p-1 text-xs">
          <button
            type="button"
            onClick={() => setMetric('charge')}
            className={cn(
              'rounded-md px-3 py-1 font-medium transition-colors',
              metric === 'charge'
                ? 'bg-paper text-accent shadow-sm'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            Charge (%)
          </button>
          <button
            type="button"
            onClick={() => setMetric('rate')}
            className={cn(
              'rounded-md px-3 py-1 font-medium transition-colors',
              metric === 'rate' ? 'bg-paper text-accent shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
          >
            Rate (W)
          </button>
          <button
            type="button"
            onClick={() => setMetric('voltage')}
            className={cn(
              'rounded-md px-3 py-1 font-medium transition-colors',
              metric === 'voltage'
                ? 'bg-paper text-accent shadow-sm'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            Voltage (V)
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-list/60 p-3">
            <p className="text-xs text-fg-muted uppercase">Latest</p>
            <p className="text-base font-semibold text-fg tabular-nums">
              {stats.current.toFixed(1)} {unit}
            </p>
          </div>
          <div className="rounded-lg bg-list/60 p-3">
            <p className="text-xs text-fg-muted uppercase">Average</p>
            <p className="text-base font-semibold text-fg tabular-nums">
              {stats.avg.toFixed(1)} {unit}
            </p>
          </div>
          <div className="rounded-lg bg-list/60 p-3">
            <p className="text-xs text-fg-muted uppercase">Minimum</p>
            <p className="text-base font-semibold text-fg tabular-nums">
              {stats.min.toFixed(1)} {unit}
            </p>
          </div>
          <div className="rounded-lg bg-list/60 p-3">
            <p className="text-xs text-fg-muted uppercase">Maximum</p>
            <p className="text-base font-semibold text-fg tabular-nums">
              {stats.max.toFixed(1)} {unit}
            </p>
          </div>
        </div>
      )}

      {historyPoints.length > 1 ? (
        <div className="relative h-48 w-full overflow-hidden rounded-lg border border-border/50 bg-list/30 p-4">
          <svg className="h-full w-full overflow-visible" preserveAspectRatio="none">
            {(() => {
              const values = [...historyPoints].reverse().map((p) => p.value);
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min || 1;
              const points = values.map((val, idx) => {
                const x = (idx / (values.length - 1)) * 100;
                const y = 100 - ((val - min) / range) * 85 - 5;
                return `${x},${y}`;
              });
              const polylinePoints = points.join(' ');
              const firstPoint = points[0];
              const lastPoint = points[points.length - 1];
              const areaPoints = `${firstPoint} ${polylinePoints} ${lastPoint.split(',')[0]},100 0,100`;

              return (
                <>
                  <defs>
                    <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--color-accent, #3b82f6)"
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-accent, #3b82f6)"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>
                  <polygon points={areaPoints} fill="url(#metricGradient)" />
                  <polyline
                    fill="none"
                    stroke="var(--color-accent, #3b82f6)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                </>
              );
            })()}
          </svg>
        </div>
      ) : (
        <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 p-6 text-center">
          <p className="text-sm font-medium text-fg">Insufficient History Data</p>
          <p className="mt-1 max-w-sm text-xs text-fg-muted">
            UPower logs history points periodically while the system runs on battery or charge.
            Continuous usage will populate this graph.
          </p>
        </div>
      )}
    </div>
  );
};
