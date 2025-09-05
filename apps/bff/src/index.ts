// BFF Test Service
import { ExpertSchema } from '@frank/contracts';
import { getSupabaseInfo } from '@frank/db';

console.log('🚀 BFF Service Starting...');

// Test shared imports
console.log('✅ Contracts imported:', ExpertSchema ? 'Success' : 'Failed');
console.log('✅ DB imported:', typeof getSupabaseInfo === 'function' ? 'Success' : 'Failed');

// Log every minute to verify the service is running
setInterval(() => {
  console.log(`[BFF] Running at ${new Date().toISOString()}`);
}, 60000);

// Keep the process running
process.on('SIGTERM', () => {
  console.log('🛑 BFF Service Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 BFF Service Interrupted...');
  process.exit(0);
});

console.log('✅ BFF Service Started - Logging every minute');
