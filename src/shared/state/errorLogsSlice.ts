import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ErrorLogEntry {
  id: string;
  timestamp: string; // ISO
  timeFormatted: string; // HH:mm:ss
  level: 'error' | 'warn';
  source: 'frontend' | 'ipc' | 'unhandled' | 'system';
  message: string;
  detail?: string;
  stack?: string;
}

interface ErrorLogsState {
  logs: ErrorLogEntry[];
}

const initialState: ErrorLogsState = {
  logs: [],
};

const MAX_LOGS = 150;

export const errorLogsSlice = createSlice({
  name: 'errorLogs',
  initialState,
  reducers: {
    addErrorLog: (
      state,
      action: PayloadAction<{
        level?: 'error' | 'warn';
        source?: 'frontend' | 'ipc' | 'unhandled' | 'system';
        message: string;
        detail?: string;
        stack?: string;
      }>,
    ) => {
      const now = new Date();
      const newEntry: ErrorLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now.toISOString(),
        timeFormatted: now.toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        level: action.payload.level ?? 'error',
        source: action.payload.source ?? 'frontend',
        message: action.payload.message || 'Unknown error occurred',
        detail: action.payload.detail,
        stack: action.payload.stack,
      };

      state.logs.unshift(newEntry);
      if (state.logs.length > MAX_LOGS) {
        state.logs = state.logs.slice(0, MAX_LOGS);
      }
    },
    clearErrorLogs: (state) => {
      state.logs = [];
    },
  },
});

export const { addErrorLog, clearErrorLogs } = errorLogsSlice.actions;
export const errorLogsReducer = errorLogsSlice.reducer;
