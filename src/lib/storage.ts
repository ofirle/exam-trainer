import type { AppState } from './types';
import { STORAGE_KEY } from './constants';
import { isSupabaseConfigured } from './supabase';
import { fetchFullState, syncStateToDb, clearAllUserData } from './database';

const createDefaultState = (): AppState => ({
  version: 1,
  globalCounter: 0,
  recentIds: [],
  progressById: {},
  examSessions: {},
  focusQueue: [],
});

const isValidState = (data: unknown): data is AppState => {
  if (!data || typeof data !== 'object') return false;
  const state = data as Record<string, unknown>;

  return (
    state.version === 1 &&
    typeof state.globalCounter === 'number' &&
    Array.isArray(state.recentIds) &&
    typeof state.progressById === 'object' &&
    state.progressById !== null &&
    typeof state.examSessions === 'object' &&
    state.examSessions !== null
  );
};

// Load state from localStorage (synchronous, used as fallback/initial state)
export const loadStateFromLocal = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultState();
    }

    const parsed = JSON.parse(stored);
    if (isValidState(parsed)) {
      // Ensure focusQueue exists for backwards compatibility
      if (!parsed.focusQueue) {
        parsed.focusQueue = [];
      }
      return parsed;
    }

    console.warn('Invalid state in localStorage, using default');
    return createDefaultState();
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return createDefaultState();
  }
};

// Load state - tries database first, falls back to localStorage
export const loadState = (): AppState => {
  // For synchronous initial load, use localStorage
  return loadStateFromLocal();
};

// Async load from database (call this after initial render)
export const loadStateAsync = async (): Promise<AppState> => {
  // First, get local state
  const localState = loadStateFromLocal();

  // If Supabase not configured, use local
  if (!isSupabaseConfigured()) {
    return localState;
  }

  try {
    const dbState = await fetchFullState();

    if (dbState) {
      // Database has data - merge with local, preferring more recent data
      const dbFocusQueue = dbState.focusQueue || [];
      const mergedState: AppState = {
        version: 1,
        globalCounter: Math.max(localState.globalCounter, dbState.globalCounter),
        recentIds: dbState.recentIds.length > 0 ? dbState.recentIds : localState.recentIds,
        progressById: { ...localState.progressById, ...dbState.progressById },
        examSessions: localState.examSessions, // Keep local exam sessions
        focusQueue: dbFocusQueue.length > 0 ? dbFocusQueue : localState.focusQueue || [],
      };

      // Save merged state locally
      saveStateToLocal(mergedState);
      return mergedState;
    }

    // No data in database, sync local state up
    if (localState.globalCounter > 0) {
      await syncStateToDb(localState);
    }

    return localState;
  } catch (error) {
    console.error('Failed to load state from database:', error);
    return localState;
  }
};

// Save state to localStorage only
export const saveStateToLocal = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
};

// Save state to both localStorage and database
export const saveState = (state: AppState): void => {
  // Always save locally for immediate persistence
  saveStateToLocal(state);

  // Async save to database (fire and forget)
  if (isSupabaseConfigured()) {
    syncStateToDb(state).catch((error) => {
      console.error('Failed to sync state to database:', error);
    });
  }
};

export const resetState = async (): Promise<AppState> => {
  const defaultState = createDefaultState();
  saveStateToLocal(defaultState);

  // Clear database data
  if (isSupabaseConfigured()) {
    await clearAllUserData();
  }

  return defaultState;
};

// Sync version for compatibility
export const resetStateSync = (): AppState => {
  const defaultState = createDefaultState();
  saveStateToLocal(defaultState);

  // Clear database data async
  if (isSupabaseConfigured()) {
    clearAllUserData().catch((error) => {
      console.error('Failed to clear database data:', error);
    });
  }

  return defaultState;
};

export const exportStateToJson = (): string => {
  const state = loadState();
  return JSON.stringify(state, null, 2);
};

export const importStateFromJson = async (json: string): Promise<{ success: boolean; state?: AppState; error?: string }> => {
  try {
    const parsed = JSON.parse(json);

    if (!isValidState(parsed)) {
      return { success: false, error: 'Invalid state format' };
    }

    // Ensure focusQueue exists
    if (!parsed.focusQueue) {
      parsed.focusQueue = [];
    }

    saveStateToLocal(parsed);

    // Sync to database
    if (isSupabaseConfigured()) {
      await syncStateToDb(parsed);
    }

    return { success: true, state: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse JSON'
    };
  }
};
