// Supabase connection setup
import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL environment variable');
  throw new Error('Missing SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

// Create a single supabase client for server-side operations
export const createServerSupabaseClient = () => {
  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      // Non-serverless optimizations
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'frank-backend'
        }
      }
    }
  );
};

// Singleton instance
let supabaseInstance: ReturnType<typeof createServerSupabaseClient> | null = null;

// Get Supabase client instance
export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createServerSupabaseClient();
  }
  return supabaseInstance;
};

// Connection management for long-running processes
export const closeConnection = () => {
  supabaseInstance = null;
};

// Graceful shutdown helper for Railway deployments
export const gracefulShutdown = () => {
  console.log('🔄 Closing Supabase connections...');
  closeConnection();
  console.log('✅ Supabase connections closed');
};

// Handle process signals for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// Type export
export type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

// Export default instance for convenience
export const supabase = getSupabaseClient();