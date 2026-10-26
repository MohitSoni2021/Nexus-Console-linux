import { useQuery } from '@tanstack/react-query';
import { ipc, CMD } from '@/shared/tauri';
import { useAppSelector } from '@/shared/state/hooks';
import { useEffectivePollMs } from '@/shared/brew';
import { powerStatisticsSchema } from './power.schema';

export function usePowerStatistics() {
  const isPowerTab = useAppSelector((s) => s.ui.activeTab === 'power');
  const pollMs = useEffectivePollMs();

  return useQuery({
    queryKey: ['power_statistics'],
    queryFn: () => ipc(CMD.GET_POWER_STATISTICS, undefined, powerStatisticsSchema),
    enabled: isPowerTab,
    refetchInterval: isPowerTab ? Math.max(pollMs, 3000) : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
