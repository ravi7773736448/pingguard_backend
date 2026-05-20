import cron from 'node-cron';
import Website from '../models/website.model.js';
import { checkAllWebsites } from '../services/monitor.service.js';
import { MONITOR_CONFIG } from '../config/constants/index.js';
import { runHourlyRollups, archiveOldLogs } from '../services/monitor/aggregation.service.js';

let isJobRunning = false;
let lastRunStart = null;
let lastRunEnd = null;
let jobStatistics = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  lastError: null
};

const jobWrapper = async () => {
  if (isJobRunning) {
    return;
  }

  isJobRunning = true;
  lastRunStart = new Date();
  jobStatistics.totalRuns++;

  try {
    const websites = await Website.find({});

    if (websites.length === 0) {
      isJobRunning = false;
      lastRunEnd = new Date();
      return;
    }

    await checkAllWebsites();

    jobStatistics.successfulRuns++;

  } catch (error) {
    jobStatistics.failedRuns++;
    jobStatistics.lastError = error.message;

    console.error(`[CRON] Job failed: ${error.message}`, error.stack);

  } finally {
    isJobRunning = false;
    lastRunEnd = new Date();
  }
};

export const startMonitoringCron = () => {
  // 1. Core website health monitoring cron (Runs every minute or configured interval)
  const job = cron.schedule(MONITOR_CONFIG.CRON_EXPRESSION, jobWrapper, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // 2. Hourly Telemetry rollup aggregation (Runs at minute 5 of every hour)
  cron.schedule('5 * * * *', async () => {
    try {
      await runHourlyRollups();
    } catch (err) {
      console.error('❌ [CRON] Hourly aggregation job failed:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // 3. Daily raw logs archiving & purging (Runs at 1:00 AM every night)
  cron.schedule('0 1 * * *', async () => {
    try {
      await archiveOldLogs(30);
    } catch (err) {
      console.error('❌ [CRON] Daily archiving job failed:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  return job;
};

export const stopMonitoringCron = () => {
};

export const getCronStatus = () => ({
  isJobRunning,
  lastRunStart: lastRunStart?.toISOString(),
  lastRunEnd: lastRunEnd?.toISOString(),
  statistics: jobStatistics,
  nextScheduledRun: 'Every minute',
  config: {
    cronExpression: MONITOR_CONFIG.CRON_EXPRESSION,
    maxConcurrent: MONITOR_CONFIG.MAX_CONCURRENT_CHECKS,
    timeout: MONITOR_CONFIG.DEFAULT_TIMEOUT
  }
});

export const triggerManualCheck = async () => {
  if (isJobRunning) {
    return {
      success: false,
      message: 'Monitoring job already running',
      isJobRunning,
      startedAt: lastRunStart
    };
  }

  await jobWrapper();
  
  return {
    success: true,
    message: 'Manual check triggered',
    lastRunStart,
    lastRunEnd
  };
};