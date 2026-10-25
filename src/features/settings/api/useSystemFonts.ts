import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ipc, CMD } from '@/shared/tauri';

export const systemFontsSchema = z.object({
  uiFonts: z.array(z.string()),
  monoFonts: z.array(z.string()),
});
export type SystemFonts = z.infer<typeof systemFontsSchema>;

export function useSystemFonts() {
  return useQuery<SystemFonts>({
    queryKey: ['system-fonts'],
    queryFn: () => ipc(CMD.GET_SYSTEM_FONTS, undefined, systemFontsSchema),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
