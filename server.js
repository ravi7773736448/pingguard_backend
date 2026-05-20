import { server } from './src/app.js';
import connectDB from './src/config/db.js';
import { startMonitoringCron } from './src/jobs/monitor.job.js';
import runMigrations from './src/migrations/run-migrations.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await runMigrations();
    
    if (process.env.START_CRON === 'true') {
      console.log('[CRON] Starting monitoring cron jobs in the main thread...');
      startMonitoringCron();
    } else {
      console.log('[CRON] Background monitoring cron jobs are disabled on this process (START_CRON !== true). Run worker.js to start background jobs.');
    }

    server.listen(PORT, () => {
      console.log('Server is  running on port 3000');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();