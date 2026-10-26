import { invoke } from '@tauri-apps/api/core';
import type { ZodType } from 'zod';
import { IpcError } from './ipc-error';
import { logError } from '@/shared/errors/errorLogger';

/** The one typed IPC entry point: invoke a Rust command and zod-validate its
 * result at the trust boundary. Only this module talks to @tauri-apps/api. */
export async function ipc<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await invoke(cmd, args);
  } catch (e) {
    const err = IpcError.from(e);
    if (err.kind !== 'cancelled') {
      logError(`IPC command "${cmd}" failed: ${err.message}`, {
        source: 'ipc',
        detail: err.detail,
        level: 'error',
      });
    }
    throw err;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const err = IpcError.fromZod(cmd, parsed.error);
    logError(`IPC validation failed for "${cmd}": ${err.message}`, {
      source: 'ipc',
      detail: err.detail,
      level: 'error',
    });
    throw err;
  }
  return parsed.data;
}

/** For commands that return nothing (mutations). No result to validate. */
export async function ipcVoid(cmd: string, args?: Record<string, unknown>): Promise<void> {
  try {
    await invoke(cmd, args);
  } catch (e) {
    const err = IpcError.from(e);
    if (err.kind !== 'cancelled') {
      logError(`IPC mutation "${cmd}" failed: ${err.message}`, {
        source: 'ipc',
        detail: err.detail,
        level: 'error',
      });
    }
    throw err;
  }
}
