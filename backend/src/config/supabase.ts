import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Server-side Supabase client with admin/service-role capabilities
// NEVER send service-role client to browser
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
