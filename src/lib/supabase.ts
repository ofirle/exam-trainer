import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEVICE_ID_KEY = 'examTrainerDeviceId';

// Get Supabase credentials from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  const configured = Boolean(supabaseUrl && supabaseAnonKey);
  console.log('[Supabase] Configured:', configured, { url: supabaseUrl ? 'set' : 'missing', key: supabaseAnonKey ? 'set' : 'missing' });
  return configured;
};

// Create Supabase client (may be null if not configured)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Get or create device ID for syncing
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
};

// Reset device ID (useful for testing or clearing data)
export const resetDeviceId = (): string => {
  const newDeviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  return newDeviceId;
};
