import { createClient } from '@supabase/supabase-js';

// Supabase configuration — set in .env file
// VITE_SUPABASE_URL=your_project_url
// VITE_SUPABASE_ANON_KEY=your_anon_key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const IS_DEMO_MODE = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'demo';

// Create real client if configured, otherwise create a minimal stub
export const supabase = IS_DEMO_MODE
  ? createClient('https://placeholder.supabase.co', 'placeholder-key')
  : createClient(supabaseUrl, supabaseAnonKey);
