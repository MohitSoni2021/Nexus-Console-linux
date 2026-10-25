export type PackageFilter = 'all' | 'formula' | 'cask' | 'rpm' | 'outdated';

export interface PackagesToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  filter: PackageFilter;
  onFilterChange: (filter: PackageFilter) => void;
  outdatedCount: number;
  onUpgradeAll: () => void;
  isUpgradingAll: boolean;
  onRefresh: () => void;
  isFetching: boolean;
}
