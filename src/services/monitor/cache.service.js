import redis from '../../config/redis.js';

export const invalidateMonitorCache = async (websiteId) => {
  try {
    const id = websiteId.toString();
    const trackingKey = `analytics:keys:${id}`;

    // Fetch all tracked cache keys for this monitor
    const keys = await redis.sMembers(trackingKey);

    if (keys && keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CACHE] Invalidated ${keys.length} cached keys for website ${id}`);
    }

    // Delete the tracking set itself
    await redis.del(trackingKey);
  } catch (error) {
    console.error(`[CACHE] Failed to invalidate cache for ${websiteId}: ${error.message}`);
  }
};
