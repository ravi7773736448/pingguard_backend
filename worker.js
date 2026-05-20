import connectDB from './src/config/db.js';
import { startMonitoringCron } from './src/jobs/monitor.job.js';

const startWorker = async () => {
  try {
    console.log('[WORKER] Initializing worker process...');
    await connectDB();
    console.log('[WORKER] Database connected successfully.');
    
    console.log('[WORKER] Starting monitoring cron jobs...');
    startMonitoringCron();
    
    console.log('🤖 PingGuard Background Cron Worker process is now running!');
  } catch (error) {
    console.error('❌ [WORKER] Failed to start background worker:', error.message);
    process.exit(1);
  }
};

startWorker();
