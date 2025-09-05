// BFF Test Service
import { ExpertSchema } from '@frank/contracts';
import { getSupabaseInfo } from '@frank/db';
import http from 'http';

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

// Start HTTP server for health checks and future API endpoints
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'bff',
      timestamp: new Date().toISOString() 
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 BFF HTTP server listening on port ${PORT}`);
});
