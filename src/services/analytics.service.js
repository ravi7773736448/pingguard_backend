import Log from '../models/log.model.js';
import Website from '../models/website.model.js';
import Incident from '../models/incident.model.js';
import HourlyStat from '../models/hourlyStat.model.js';
import redis from '../config/redis.js';
import mongoose from 'mongoose';

const CACHE_TTL = 60;

export const getWebsiteAnalytics = async (websiteId, options = {}) => {
  const {
    period = 24,
    interval = 'hour'
  } = options;

  const websiteObjectId = new mongoose.Types.ObjectId(websiteId);
  const cacheKey = `analytics:${websiteId}:${period}:${interval}`;

  try {
    const cachedAnalytics = await redis.get(cacheKey);

    if (cachedAnalytics) {
      return JSON.parse(cachedAnalytics);
    }

    let uptimeStats, recentLogs, hourlyData;

    if (period > 24) {
      // SMART ROUTER: Use pre-aggregated HourlyStat collection to protect MongoDB performance
      const since = new Date(Date.now() - period * 60 * 60 * 1000);
      const websiteObjectId = new mongoose.Types.ObjectId(websiteId);

      const [hourlyAgg, stats, logs] = await Promise.all([
        HourlyStat.aggregate([
          {
            $match: {
              websiteId: websiteObjectId,
              timestamp: { $gte: since }
            }
          },
          {
            $group: {
              _id: null,
              totalChecks: { $sum: '$totalChecks' },
              upChecks: { $sum: '$upCount' },
              downChecks: { $sum: '$downCount' },
              slowChecks: { $sum: '$slowCount' },
              avgResponseTime: { $avg: '$avgResponseTime' },
              minResponseTime: { $min: '$minResponseTime' },
              maxResponseTime: { $max: '$maxResponseTime' }
            }
          }
        ]),
        HourlyStat.find({
          websiteId: websiteObjectId,
          timestamp: { $gte: since }
        }).sort({ timestamp: -1 }).lean(),
        Log.getRecentLogs(websiteId, 50)
      ]);

      const agg = hourlyAgg[0] || {};
      uptimeStats = [
        { _id: 'UP', count: agg.upChecks || 0, avgResponseTime: agg.avgResponseTime || 0, minResponseTime: agg.minResponseTime || 0, maxResponseTime: agg.maxResponseTime || 0 },
        { _id: 'DOWN', count: agg.downChecks || 0 },
        { _id: 'SLOW', count: agg.slowChecks || 0, avgResponseTime: agg.avgResponseTime || 0 }
      ];

      recentLogs = logs;

      hourlyData = stats.map(s => ({
        _id: {
          year: s.timestamp.getFullYear(),
          month: s.timestamp.getMonth() + 1,
          day: s.timestamp.getDate(),
          hour: s.timestamp.getHours()
        },
        count: s.totalChecks,
        upCount: s.upCount,
        downCount: s.downCount,
        slowCount: s.slowCount,
        avgResponseTime: s.avgResponseTime
      }));

    } else {
      // Query raw Log collection for short-term telemetry (<= 24 hours) for high-resolution accuracy
      const [rawUptime, logs, rawHourly] = await Promise.all([
        Log.getUptimeStats(websiteId, period),
        Log.getRecentLogs(websiteId, 50),
        interval === 'hour' ? Log.getHourlyStats(websiteId, period) : []
      ]);

      uptimeStats = rawUptime;
      recentLogs = logs;
      hourlyData = rawHourly;
    }

    const totalChecks = uptimeStats.reduce((sum, stat) => sum + stat.count, 0);
    const upChecks = uptimeStats.find(s => s._id === 'UP')?.count || 0;
    const downChecks = uptimeStats.find(s => s._id === 'DOWN')?.count || 0;
    const slowChecks = uptimeStats.find(s => s._id === 'SLOW')?.count || 0;

    const uptimePercentage = totalChecks > 0 
      ? Math.round((upChecks / totalChecks) * 100) 
      : 100;

    const avgResponseTime = uptimeStats.find(s => s._id !== 'DOWN')?.avgResponseTime || 0;

    const analyticsResult = {
      uptime: uptimePercentage,
      totalChecks,
      statusBreakdown: {
        up: upChecks,
        down: downChecks,
        slow: slowChecks
      },
      responseTime: {
        average: Math.round(avgResponseTime),
        min: Math.round(uptimeStats.find(s => s.avgResponseTime)?.minResponseTime || 0),
        max: Math.round(uptimeStats.find(s => s.avgResponseTime)?.maxResponseTime || 0)
      },
      recentLogs: recentLogs.map(log => ({
        status: log.status,
        responseTime: log.responseTime,
        statusCode: log.statusCode,
        errorType: log.errorType,
        checkedAt: log.checkedAt
      })),
      hourlyData: hourlyData.map(h => ({
        timestamp: new Date(h._id.year, h._id.month - 1, h._id.day, h._id.hour),
        count: h.count,
        up: h.upCount,
        down: h.downCount,
        slow: h.slowCount,
        avgResponseTime: Math.round(h.avgResponseTime)
      })),
      period: `${period} hours`
    };

    await redis.set(cacheKey, JSON.stringify(analyticsResult), {
      EX: CACHE_TTL
    });

    // Track cache key inside a Redis Set for efficient, predictable cache invalidation without wildcards
    try {
      const trackingKey = `analytics:keys:${websiteId}`;
      await redis.sAdd(trackingKey, cacheKey);
      await redis.expire(trackingKey, CACHE_TTL);
    } catch (trackError) {
      console.error(`[ANALYTICS] Cache tracking error: ${trackError.message}`);
    }

    return analyticsResult;

  } catch (error) {
    console.error('[ANALYTICS]', error.message, 'websiteId:', websiteId);
    throw error;
  }
};

export const getAllWebsitesOverview = async (userId) => {
  try {
    const websites = await Website.find({ userId })
      .select('name url status lastCheckedAt lastResponseTime uptimePercentage')
      .lean();

    const overview = websites.map(site => ({
      _id: site._id,
      name: site.name || site.url,
      url: site.url,
      status: site.status,
      lastChecked: site.lastCheckedAt,
      responseTime: site.lastResponseTime,
      uptime: site.uptimePercentage
    }));

    const summary = {
      total: websites.length,
      up: websites.filter(s => s.status === 'UP').length,
      down: websites.filter(s => s.status === 'DOWN').length,
      slow: websites.filter(s => s.status === 'SLOW').length,
      unknown: websites.filter(s => s.status === 'UNKNOWN').length
    };

    return { websites: overview, summary };

  } catch (error) {
    console.error('[ANALYTICS] Overview error:', error.message);
    throw error;
  }
};

export const getDowntimeIncidents = async (websiteId, days = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const incidents = await Incident.find({
    websiteId: new mongoose.Types.ObjectId(websiteId),
    createdAt: { $gte: since }
  })
  .sort({ createdAt: -1 })
  .lean();

  return incidents.map(incident => ({
    _id: incident._id,
    startTime: incident.startTime,
    endTime: incident.endTime,
    duration: incident.duration,
    errorType: incident.errorType,
    aiSummary: incident.aiSummary,
    createdAt: incident.createdAt
  }));
};

export const getAllUserIncidents = async (userId, limit = 10) => {
  try {
    const userWebsites = await Website.find({ userId }).select('_id name url').lean();
    const websiteIds = userWebsites.map(w => w._id);

    if (websiteIds.length === 0) {
      return [];
    }

    const incidents = await Incident.find({
      websiteId: { $in: websiteIds }
    })
    .sort({ createdAt: -1})
    .limit(limit)
    .lean();

    const websiteMap = new Map(userWebsites.map(w => [w._id.toString(), w.name || w.url]));

    return incidents.map(incident => {
      const websiteName = websiteMap.get(incident.websiteId?.toString()) || 'Unknown Website';
      return {
        _id: incident._id,
        websiteId: incident.websiteId,
        websiteName,
        startTime: incident.startTime,
        endTime: incident.endTime,
        duration: incident.duration,
        errorType: incident.errorType,
        aiSummary: incident.aiSummary,
        createdAt: incident.createdAt
      };
    });
  } catch (error) {
    console.error('[ANALYTICS] Get all incidents error:', error.message);
    throw error;
  }
};