import { useState, useMemo } from 'react';
import { RotateCcw, Type, Code2, Search, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/shared/state/hooks';
import { setUiFont, setMonoFont, resetFonts } from '@/shared/state/settingsSlice';
import { useSystemFonts } from '@/features/settings/api/useSystemFonts';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';

interface FontSelectorProps {
  label: string;
  kindDescription: string;
  icon: React.ReactNode;
  currentFont: string;
  onSelect: (font: string) => void;
  onReset: () => void;
  fonts: string[];
  isMono?: boolean;
  sampleText: string;
  defaultLabel: string;
}

const FontSelectorCard = ({
  label,
  kindDescription,
  icon,
  currentFont,
  onSelect,
  onReset,
  fonts,
  isMono = false,
  sampleText,
  defaultLabel,
}: FontSelectorProps) => {
  const [search, setSearch] = useState('');
  const isDefault = !currentFont || currentFont === 'default';

  const filteredFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fonts;
    return fonts.filter((f) => f.toLowerCase().includes(q));
  }, [fonts, search]);

  const activeFamily = isDefault
    ? isMono
      ? 'var(--font-mono)'
      : 'var(--font-sans)'
    : `"${currentFont}", ${isMono ? 'monospace' : 'sans-serif'}`;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-paper p-5 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-list text-fg">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fg">{label}</h3>
            <p className="text-xs text-fg-muted">{kindDescription}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={isDefault}
          onClick={onReset}
          className="gap-1.5 text-xs text-fg-muted hover:text-fg"
          title="Restore system default font"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore default
        </Button>
      </div>

      {/* Interactive preview box */}
      <div
        className="mt-4 rounded-lg border border-border bg-list/60 p-3.5 transition-all"
        style={{ fontFamily: activeFamily }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 text-[11px] text-fg-subtle">
          <span className="font-sans font-medium tracking-wider uppercase">Live Preview</span>
          <span className="rounded bg-paper px-2 py-0.5 text-xs font-semibold text-fg shadow-xs">
            {isDefault ? defaultLabel : currentFont}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg select-text">{sampleText}</p>
      </div>

      {/* Font selector with filter */}
      <div className="mt-4 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${fonts.length} available system fonts…`}
            className="h-8.5 w-full rounded-md border border-border bg-canvas pr-3 pl-8 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
        </div>

        <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-canvas p-1">
          {/* Default option */}
          <button
            type="button"
            onClick={() => onSelect('default')}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
              isDefault
                ? 'bg-accent font-medium text-accent-fg'
                : 'text-fg hover:bg-list hover:text-fg'
            }`}
          >
            <span>{defaultLabel} (Default)</span>
            {isDefault && <Check className="h-3.5 w-3.5" />}
          </button>

          {filteredFonts.map((font) => {
            const isSelected = currentFont === font;
            return (
              <button
                key={font}
                type="button"
                onClick={() => onSelect(font)}
                style={{ fontFamily: `"${font}", ${isMono ? 'monospace' : 'sans-serif'}` }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-accent font-medium text-accent-fg'
                    : 'text-fg hover:bg-list hover:text-fg'
                }`}
              >
                <span className="truncate">{font}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}

          {filteredFonts.length === 0 && (
            <p className="py-4 text-center text-xs text-fg-subtle">
              No font found matching &quot;{search}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const FontPicker = () => {
  const dispatch = useAppDispatch();
  const uiFont = useAppSelector((s) => s.settings.uiFont);
  const monoFont = useAppSelector((s) => s.settings.monoFont);
  const { data: fontsData, isPending } = useSystemFonts();

  const isCustomized = (uiFont && uiFont !== 'default') || (monoFont && monoFont !== 'default');

  const uiFonts = fontsData?.uiFonts ?? [];
  const monoFonts = fontsData?.monoFonts ?? [];

  return (
    <section className="rounded-xl border border-border bg-paper p-5 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-base font-semibold text-fg">Typography &amp; Fonts</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Customize the fonts used across Nexus Console. Choose from installed fonts on your
            system.
          </p>
        </div>
        {isCustomized && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => dispatch(resetFonts())}
            className="gap-1.5 text-xs text-fg-muted hover:text-fg"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all fonts to default
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* UI Font Selector */}
          <FontSelectorCard
            label="Interface Font (Sans-serif)"
            kindDescription="Applied to sidebar navigation, dialogs, buttons, cards, and headings."
            icon={<Type className="h-4 w-4" />}
            currentFont={uiFont}
            onSelect={(font) => dispatch(setUiFont(font))}
            onReset={() => dispatch(setUiFont('default'))}
            fonts={uiFonts}
            isMono={false}
            sampleText="Nexus Console — High-performance developer cockpit with real-time process monitoring."
            defaultLabel="System Sans-serif"
          />

          {/* Monospace Font Selector */}
          <FontSelectorCard
            label="Monospace Font (Code &amp; Terminal)"
            kindDescription="Applied to embedded terminal PTY, package names, ports, PIDs, and code snippets."
            icon={<Code2 className="h-4 w-4" />}
            currentFont={monoFont}
            onSelect={(font) => dispatch(setMonoFont(font))}
            onReset={() => dispatch(setMonoFont('default'))}
            fonts={monoFonts}
            isMono={true}
            sampleText="const service = { name: 'redis', port: 6379, active: true }; // pid: 4891"
            defaultLabel="System Monospace"
          />
        </div>
      )}
    </section>
  );
};
