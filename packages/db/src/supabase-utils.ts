// Supabase utilities and helpers
import { getSupabaseClient } from './connection';

// Health check for Supabase connection (optimized for persistent services)
export async function healthCheck() {
  try {
    const supabase = getSupabaseClient();
    
    // Test Supabase connection by trying to access a table
    const { data, error } = await supabase
      .from('experts')
      .select('count')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }
    
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connection: 'Supabase client connected',
      environment: 'persistent-service',
      uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown'
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: 'persistent-service'
    };
  }
}

// Connection monitoring for long-running services
let connectionChecks = 0;
let lastCheckTime = Date.now();

export async function monitorConnection() {
  connectionChecks++;
  lastCheckTime = Date.now();
  
  const health = await healthCheck();
  
  if (health.status === 'unhealthy') {
    console.error(`🔴 Supabase connection unhealthy (check #${connectionChecks}):`, health.error);
  } else {
    console.log(`🟢 Supabase connection healthy (check #${connectionChecks})`);
  }
  
  return health;
}

// Get connection statistics
export function getConnectionStats() {
  return {
    totalChecks: connectionChecks,
    lastCheckTime: new Date(lastCheckTime).toISOString(),
    uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown'
  };
}

// Get Supabase connection info
export function getSupabaseInfo() {
  const supabaseUrl = process.env.SUPABASE_URL;
  
  if (!supabaseUrl) return null;
  
  try {
    const parsed = new URL(supabaseUrl);
    return {
      project: parsed.hostname.split('.')[0],
      url: supabaseUrl,
      region: parsed.hostname.includes('aws') ? 'AWS' : 'Unknown'
    };
  } catch {
    return null;
  }
}