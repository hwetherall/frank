import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const testConnection = async () => {
  try {
    const { count, error } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { success: false, message: 'Connected but "contacts" table not found. Run sql/schema.sql in Supabase.' };
      }
      throw error;
    }

    return { success: true, message: `Connected. ${count} contacts in database.` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` };
  }
};
