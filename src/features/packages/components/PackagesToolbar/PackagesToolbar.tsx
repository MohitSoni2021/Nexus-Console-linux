import { ArrowUpCircle, RefreshCw, Search } from 'lucide-react';
import { SegmentedControl, type SegmentOption } from '@/shared/ui/SegmentedControl';
import { Button } from '@/shared/ui/Button';
import { ThemeToggle } from '@/shared/layout/ThemeToggle';
import { cn } from '@/shared/lib/cn';
import { useAppContext } from '@/shared/tauri';
import type { PackagesToolbarProps, PackageFilter } from './PackagesToolbar.types';

const FILTERS_MAC: SegmentOption<PackageFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'formula', label: 'Formulae' },
  { value: 'cask', label: 'Casks' },
  { value: 'outdated', label: 'Outdated' },
];

const FILTERS_LINUX: SegmentOption<PackageFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'rpm', label: 'RPM' },
  { value: 'flatpak', label: 'Flatpak' },
  { value: 'outdated', label: 'Outdated' },
];

export const PackagesToolbar = ({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  outdatedCount,
  onUpgradeAll,
  isUpgradingAll,
  onRefresh,
  isFetching,
}: PackagesToolbarProps) => {
  const { data: context } = useAppContext();
  const options = context?.platform === 'linux' ? FILTERS_LINUX : FILTERS_MAC;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search packages…"
          aria-label="Search packages"
          data-nx-page-search
          className="h-9 w-full rounded-md border border-border bg-paper pr-3 pl-8 text-sm text-fg placeholder:text-fg-subtle sm:w-56"
        />
      </div>
      <ThemeToggle />
      <SegmentedControl
        ariaLabel="Filter"
        value={filter}
        options={options}
        onChange={onFilterChange}
      />
      {outdatedCount > 0 && (
        <Button size="sm" disabled={isUpgradingAll} onClick={onUpgradeAll}>
          <ArrowUpCircle className={cn('h-4 w-4', isUpgradingAll && 'animate-spin')} />
          Upgrade all ({outdatedCount})
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={onRefresh}>
        <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  );
};
