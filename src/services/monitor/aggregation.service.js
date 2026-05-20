import mongoose from 'mongoose';
import Log from '../../models/log.model.js';
import HourlyStat from '../../models/hourlyStat.model.js';
import LogArchive from '../../models/logArchive.model.js';
import Website from '../../models/website.model.js';

/**
 * Perform a statistical hourly aggregation for a specific website and hour window.
 * This function calculates min/max/avg latency and status counts, then upserts the result.
 * 
 * @param {string} websiteId 
 * @param {Date} startHour - The exact starting Date of the target hour (e.g. 14:00:00)
 * @returns {Promise<object|null>} The generated HourlyStat document or null if no logs exist
 */
export const aggregateHourlyLogsForWebsite = async (websiteId, startHour) => {
  const endHour = new Date(startHour.getTime() + 60 * 60 * 1000); // 1 hour later
  const websiteObjectId = new mongoose.Types.ObjectId(websiteId);

  // Run MongoDB Aggregation over the 1-hour window
  const aggregationResult = await Log.aggregate([
    {
      $match: {
        websiteId: websiteObjectId,
        checkedAt: {
          $gte: startHour,
          $lt: endHour
        }
      }
    },
    {
      $group: {
        _id: '$websiteId',
        totalChecks: { $sum: 1 },
        upCount: {
          $sum: { $cond: [{ $eq: ['$status', 'UP'] }, 1, 0] }
        },
        downCount: {
          $sum: { $cond: [{ $eq: ['$status', 'DOWN'] }, 1, 0] }
        },
        slowCount: {
          $sum: { $cond: [{ $eq: ['$status', 'SLOW'] }, 1, 0] }
        },
        avgResponseTime: { $avg: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' }
      }
    }
  ]);

  if (aggregationResult.length === 0) {
    // If no logs exist for this hour window, return null
    return null;
  }

  const stats = aggregationResult[0];

  // Perform idempotent upsert to prevent double entries if job is re-run
  const hourlyStat = await HourlyStat.findOneAndUpdate(
    {
      websiteId: websiteObjectId,
      timestamp: startHour
    },
    {
      totalChecks: stats.totalChecks,
      upCount: stats.upCount,
      downCount: stats.downCount,
      slowCount: stats.slowCount,
      avgResponseTime: Math.round(stats.avgResponseTime),
      minResponseTime: stats.minResponseTime,
      maxResponseTime: stats.maxResponseTime
    },
    {
      upsert: true,
      new: true
    }
  );

  return hourlyStat;
};

/**
 * Aggregates all raw logs for all active monitors for a completed hour.
 * 
 * @param {Date} [targetHour] - The starting Date of the hour to aggregate. Defaults to the previous hour.
 */
export const runHourlyRollups = async (targetHour) => {
  // If targetHour is not specified, calculate for the previous hour
  let startHour = targetHour;
  if (!startHour) {
    const now = new Date();
    startHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 1, 0, 0, 0);
  }

  console.log(`📊 [CRON] Starting hourly statistics aggregation for hour starting: ${startHour.toISOString()}`);

  try {
    const websites = await Website.find({ isPaused: false }).select('_id');
    let successfulRollups = 0;

    for (const site of websites) {
      const stats = await aggregateHourlyLogsForWebsite(site._id, startHour);
      if (stats) {
        successfulRollups++;
      }
    }

    console.log(`📊 [CRON] Hourly rollups complete. Successfully aggregated ${successfulRollups} websites for hour starting: ${startHour.toISOString()}`);
    return { success: true, count: successfulRollups };
  } catch (error) {
    console.error(`❌ [CRON] Hourly aggregation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Copies older raw logs to LogArchive collection before TTL index cleans them up,
 * processing in memory-safe batches to prevent performance impact on MongoDB.
 * 
 * @param {number} [days=30] - Threshold in days for archiving logs.
 */
export const archiveOldLogs = async (days = 30) => {
  const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  console.log(`📦 [CRON] Starting archiving task for raw logs older than ${days} days (Before: ${thresholdDate.toISOString()})`);

  try {
    let totalArchived = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      // Find a batch of older logs that haven't been archived yet.
      // We look for logs older than 30 days. To prevent duplicate archiving,
      // we check logs that don't exist in LogArchive, or we can copy and delete them.
      // Note: MongoDB TTL index will automatically delete them, so we just copy them first.
      // To ensure we don't copy the same logs repeatedly, we can query logs,
      // write them to Archive, and delete them immediately ourselves to be safe and clean!
      // This is a much better self-contained archive-and-purge routine.
      const logs = await Log.find({ checkedAt: { $lt: thresholdDate } })
        .limit(batchSize)
        .lean();

      if (logs.length === 0) {
        hasMore = false;
        break;
      }

      const formattedArchives = logs.map(log => ({
        websiteId: log.websiteId,
        status: log.status,
        responseTime: log.responseTime,
        statusCode: log.statusCode,
        errorType: log.errorType,
        checkedAt: log.checkedAt
      }));

      // 1. Insert into LogArchive
      await LogArchive.insertMany(formattedArchives, { ordered: false });

      // 2. Remove from active Log collection
      const logIds = logs.map(log => log._id);
      await Log.deleteMany({ _id: { $in: logIds } });

      totalArchived += logs.length;
      console.log(`📦 [CRON] Archived batch of ${logs.length} raw records.`);
    }

    console.log(`📦 [CRON] Archiving process complete. Successfully archived and purged ${totalArchived} old logs.`);
    return { success: true, count: totalArchived };

  } catch (error) {
    console.error(`❌ [CRON] Raw logs archiving failed: ${error.message}`);
    throw error;
  }
};
