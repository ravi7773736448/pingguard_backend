import pLimit from 'p-limit';
import Website from '../models/website.model.js';
import Log from '../models/log.model.js';
import { executeCheck } from './monitor/httpChecker.js';
import { getOrStartOutage, resolveOutage } from './monitor/incidentManager.js';
import { invalidateMonitorCache } from './monitor/cache.service.js';
import { emitStatusUpdate, emitBatchComplete } from './monitor/socket.service.js';
import { queueAISummary } from './monitor/aiSummary.service.js';
import { sendAlertNotification } from './monitor/notification.service.js';
import { HTTP_STATUS, MONITOR_CONFIG } from '../config/constants/index.js';

const limit = pLimit(MONITOR_CONFIG.MAX_CONCURRENT_CHECKS);

const processSingleCheck = async (website, email) => {
  const previousStatus = website.lastKnownStatus || website.status;
  
  // 1. HTTP Request Execution
  const checkResult = await executeCheck(website);
  
  // 2. Incident & Persistence Manager
  let activeIncident = null;
  let isNewOutage = false;

  if (checkResult.status === HTTP_STATUS.DOWN) {
    const outageState = await getOrStartOutage(website, checkResult);
    activeIncident = outageState.activeIncident;
    isNewOutage = outageState.isNewOutage;
  } else if (previousStatus === HTTP_STATUS.DOWN) {
    // Check if recovery is occurring
    activeIncident = await resolveOutage(website, checkResult);
  }

  // 3. Database Log Recording
  await Log.create({
    websiteId: website._id,
    status: checkResult.status,
    responseTime: checkResult.responseTime,
    statusCode: checkResult.statusCode,
    errorType: checkResult.errorType
  });

  // 4. Update core Monitor document state
  website.status = checkResult.status;
  website.lastKnownStatus = checkResult.status;
  website.lastResponseTime = checkResult.responseTime;
  website.lastStatusCode = checkResult.statusCode;
  website.lastCheckedAt = new Date();
  if (isNewOutage) {
    website.alertSent = true;
    website.lastAlertSentAt = new Date();
  }
  await website.save();

  // 5. Cache invalidation
  await invalidateMonitorCache(website._id);

  // 6. Security-First Sockets Emits
  await emitStatusUpdate(website.userId, website._id, checkResult, previousStatus);

  // 7. Deferred background AI Summary (Async & Non-blocking)
  if (activeIncident && checkResult.status !== HTTP_STATUS.DOWN && previousStatus === HTTP_STATUS.DOWN) {
    queueAISummary(activeIncident, website);
  }

  // 8. Alerts Notifications
  if (isNewOutage) {
    await sendAlertNotification(email, website, checkResult, null, 'DOWN');
  } else if (activeIncident && previousStatus === HTTP_STATUS.DOWN) {
    await sendAlertNotification(email, website, checkResult, activeIncident, 'UP');
  }

  return checkResult;
};

export const checkSingleWebsite = async (website) => {
  const populatedWebsite = await Website.findById(website._id).populate('userId', 'email');
  const email = populatedWebsite?.userId?.email;
  return processSingleCheck(populatedWebsite, email);
};

export const checkAllWebsites = async () => {
  const websites = await Website.find({ isPaused: false }).populate('userId', 'email');
  
  const results = await Promise.all(
    websites.map((website) => 
      limit(() => processSingleCheck(website, website.userId?.email))
    )
  );

  // Group batch stats by user to prevent leaking summary data to wrong rooms
  const userBatches = {};
  websites.forEach((site, index) => {
    const userId = site.userId?._id?.toString();
    if (!userId) return;

    if (!userBatches[userId]) {
      userBatches[userId] = { total: 0, up: 0, down: 0, slow: 0 };
    }
    
    userBatches[userId].total++;
    const res = results[index];
    if (res.status === HTTP_STATUS.UP) userBatches[userId].up++;
    else if (res.status === HTTP_STATUS.DOWN) userBatches[userId].down++;
    else if (res.status === HTTP_STATUS.SLOW) userBatches[userId].slow++;
  });

  // Securely emit complete batches strictly to respective user rooms
  for (const [userId, stats] of Object.entries(userBatches)) {
    await emitBatchComplete(userId, stats);
  }

  return { processedCount: websites.length };
};

export const checkWebsitesByUser = async (userId) => {
  const websites = await Website.find({ userId }).populate('userId', 'email');
  
  const results = await Promise.all(
    websites.map((website) =>
      limit(() => processSingleCheck(website, website.userId?.email))
    )
  );

  return { websites: websites.length, results };
};