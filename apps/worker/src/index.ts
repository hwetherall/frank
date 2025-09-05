// Worker Test Service
import { ExpertSchema } from '@frank/contracts';
import { healthCheck } from '@frank/db';

console.log('⚙️ Worker Service Starting...');

// Test shared imports
console.log('✅ Contracts imported:', ExpertSchema ? 'Success' : 'Failed');
console.log('✅ DB imported:', typeof healthCheck === 'function' ? 'Success' : 'Failed');

// Log every minute to verify the service is running
setInterval(() => {
  console.log(`[Worker] Running at ${new Date().toISOString()}`);
}, 60000);

// Keep the process running
process.on('SIGTERM', () => {
  console.log('🛑 Worker Service Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Worker Service Interrupted...');
  process.exit(0);
});

console.log('✅ Worker Service Started - Logging every minute');
