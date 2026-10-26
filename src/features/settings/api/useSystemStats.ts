import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/shared/tauri/invoke';
import { CMD } from '@/shared/tauri/commands';
import { systemStatsSchema, type SystemStats } from '@/shared/tauri/schemas';

export const systemStatsQueryKey = ['system-stats'] as const;

export function useSystemStats(enabled = true) {
  return useQuery<SystemStats>({
    queryKey: systemStatsQueryKey,
    queryFn: () => ipc(CMD.GET_SYSTEM_STATS, undefined, systemStatsSchema),
    staleTime: 5000,
    gcTime: 60000,
    enabled,
    refetchInterval: enabled ? 10000 : false,
  });
}
