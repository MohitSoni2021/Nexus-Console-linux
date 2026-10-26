import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { PowerDevice } from '../api/power.schema';

interface PowerDetailsTableProps {
  device: PowerDevice;
}

export const PowerDetailsTable = ({ device }: PowerDetailsTableProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-paper">
      <div className="grid grid-cols-12 border-b border-border bg-list/60 px-4 py-2.5 text-xs font-semibold tracking-wider text-fg-muted uppercase">
        <div className="col-span-5 sm:col-span-4">Attribute</div>
        <div className="col-span-7 sm:col-span-8">Value</div>
      </div>

      <div className="divide-y divide-border/60">
        {device.attributes.map((attr) => {
          const isCopied = copiedKey === attr.key;
          return (
            <div
              key={attr.key}
              className="group grid grid-cols-12 items-center px-4 py-2.5 text-sm transition-colors hover:bg-list/40"
            >
              <div className="col-span-5 text-xs font-medium text-fg-muted sm:col-span-4 sm:text-sm">
                {attr.label}
              </div>
              <div className="col-span-7 flex items-center justify-between gap-2 font-mono text-xs text-fg sm:col-span-8 sm:text-sm">
                <span className="truncate selection:bg-accent-soft selection:text-accent">
                  {attr.value}
                </span>
                <button
                  type="button"
                  onClick={() => copyValue(attr.key, attr.value)}
                  className="rounded p-1 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-fg"
                  title="Copy value"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
