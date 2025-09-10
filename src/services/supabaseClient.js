import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Test Supabase connection
 */
export const testConnection = async () => {
  try {
    // Test connection by trying to access the database metadata
    const { data, error } = await supabase.rpc('version');
    
    // If RPC doesn't work, try a simple query that should always work
    if (error) {
      const { error: selectError } = await supabase.from('information_schema.tables').select('table_name').limit(1);
      if (selectError && !selectError.message.includes('permission denied')) {
        throw selectError;
      }
    }
    
    return { success: true, message: 'Connected to Supabase successfully' };
  } catch (error) {
    // Check if it's just a table not found error (which is fine for empty databases)
    if (error.message.includes('Could not find the table') || 
        error.message.includes('relation does not exist') ||
        error.code === 'PGRST116') {
      return { success: true, message: 'Connected to Supabase successfully (empty database)' };
    }
    return { success: false, message: `Connection failed: ${error.message}` };
  }
};
