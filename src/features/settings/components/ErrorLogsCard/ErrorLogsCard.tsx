import { useState, useMemo } from 'react';
import {
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Trash2,
  Search,
  PlusCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/state/hooks';
import { clearErrorLogs, type ErrorLogEntry } from '@/shared/state/errorLogsSlice';
import { logError } from '@/shared/errors/errorLogger';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

export const ErrorLogsCard = () => {
  const dispatch = useAppDispatch();
  const logs = useAppSelector((s) => s.errorLogs.logs);
  const [filter, setFilter] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const filteredLogs = useMemo(() => {
    if (!filter.trim()) return logs;
    const q = filter.toLowerCase();
    return logs.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        (l.detail && l.detail.toLowerCase().includes(q)),
    );
  }, [logs, filter]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyEntry = async (entry: ErrorLogEntry) => {
    const text = `[${entry.timeFormatted}] [${entry.source.toUpperCase()}] ${entry.message}${
      entry.detail ? `\nDetail: ${entry.detail}` : ''
    }${entry.stack ? `\nStack: ${entry.stack}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Fallback
    }
  };

  const copyAll = async () => {
    if (logs.length === 0) return;
    const text = logs
      .map(
        (l) =>
          `[${l.timeFormatted}] [${l.source.toUpperCase()}] ${l.message}${
            l.detail ? `\n  Detail: ${l.detail}` : ''
          }${l.stack ? `\n  Stack: ${l.stack}` : ''}`,
      )
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      // Fallback
    }
  };

  const simulateTestError = () => {
    logError('Sample simulated error log to verify logging system', {
      source: 'frontend',
      level: 'warn',
      detail: 'This is a test warning created from the Settings error log panel.',
      stack: 'Error: Sample simulated error\n    at simulateTestError (ErrorLogsCard.tsx:75)',
    });
  };

  return (
    <section className="rounded-xl border border-border bg-paper p-5 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warn-soft text-warn">
            <Bug className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-fg">Error Logs</h2>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  logs.length > 0 ? 'bg-warn-soft text-warn' : 'bg-surface text-fg-muted',
                )}
              >
                {logs.length} {logs.length === 1 ? 'log' : 'logs'}
              </span>
            </div>
            <p className="text-xs text-fg-muted">
              Temporary in-memory logs for this session. Cleared upon closing the app.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={simulateTestError}
            title="Log a sample test message"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Simulate
          </Button>

          {logs.length > 0 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyAll}
                title="Copy all error logs to clipboard"
              >
                {copiedAll ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-running" />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="h-3.5 w-3.5" />
                    Copy All
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(clearErrorLogs())}
                title="Clear all logs"
                className="text-danger hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {logs.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-fg-muted" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter error messages or sources…"
              className="bg-surface h-8.5 w-full rounded-md border border-border pr-3 pl-8 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>
          {filter && (
            <button onClick={() => setFilter('')} className="text-xs text-fg-muted hover:text-fg">
              Clear filter
            </button>
          )}
        </div>
      )}

      <div className="mt-4">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
            <div className="bg-surface flex h-10 w-10 items-center justify-center rounded-full text-fg-muted">
              <Check className="h-5 w-5 text-running" />
            </div>
            <p className="mt-2 text-sm font-medium text-fg">No error logs recorded</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Any runtime, IPC, or unhandled exceptions encountered in this session will appear here
              temporarily.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="py-6 text-center text-xs text-fg-muted">No error logs match “{filter}”.</p>
        ) : (
          <div className="bg-surface max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {filteredLogs.map((entry) => {
              const isExpanded = Boolean(expandedIds[entry.id]);
              const hasExtra = Boolean(entry.detail || entry.stack);
              const isCopied = copiedId === entry.id;

              return (
                <div key={entry.id} className="hover:bg-hover p-3 text-xs transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      disabled={!hasExtra}
                      className={cn(
                        'flex flex-1 items-start gap-2.5 text-left',
                        hasExtra ? 'cursor-pointer select-none' : 'cursor-default',
                      )}
                      onClick={() => hasExtra && toggleExpand(entry.id)}
                    >
                      {hasExtra ? (
                        isExpanded ? (
                          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" />
                        )
                      ) : (
                        <div className="w-3.5 shrink-0" />
                      )}

                      <span className="shrink-0 font-mono text-[11px] text-fg-muted">
                        {entry.timeFormatted}
                      </span>

                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                          entry.level === 'warn'
                            ? 'bg-warn-soft text-warn'
                            : 'bg-danger-soft text-danger',
                        )}
                      >
                        {entry.source}
                      </span>

                      <span className="font-mono leading-relaxed break-all text-fg">
                        {entry.message}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => copyEntry(entry)}
                        title="Copy log entry"
                        className="hover:bg-surface rounded p-1 text-fg-muted transition-colors hover:text-fg"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-running" />
                        ) : (
                          <Clipboard className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {hasExtra && isExpanded && (
                    <div className="mt-2.5 ml-6 space-y-2 rounded border border-border bg-paper p-2.5 font-mono text-[11px] text-fg-muted">
                      {entry.detail && (
                        <div>
                          <p className="font-semibold text-fg">Detail:</p>
                          <pre className="mt-1 leading-relaxed break-all whitespace-pre-wrap text-fg">
                            {entry.detail}
                          </pre>
                        </div>
                      )}
                      {entry.stack && (
                        <div>
                          <p className="font-semibold text-fg">Stack Trace:</p>
                          <pre className="mt-1 max-h-36 overflow-x-auto leading-tight break-all whitespace-pre-wrap">
                            {entry.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
