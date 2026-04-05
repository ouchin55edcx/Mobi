import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Get environment variables
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  Constants.expoConfig?.extra?.supabaseKey ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL environment variable. Please create a .env file with your Supabase URL.",
  );
}

if (!supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_KEY environment variable. Please create a .env file with your Supabase anon key.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});
