import { getIO, emitToUser, emitToWebsite, emitToAll } from '../socket/index.js';
import Website from '../models/website.model.js';

export const emitWebsiteStatusChange = async (websiteId, status, responseTime, previousStatus) => {
  try {
    const website = await Website.findById(websiteId).populate('userId', 'name email');
    
    if (!website) {
      console.error(`❌ [SOCKET] Website not found: ${websiteId}`);
      return false;
    }

    const eventData = {
      websiteId: website._id.toString(),
      url: website.url,
      name: website.name,
      status,
      previousStatus,
      responseTime,
      timestamp: new Date().toISOString(),
      userId: website.userId?._id?.toString()
    };

    // emitToAll('website-status-changed', eventData); (removed to enforce strict security room segregation)
    
    if (website.userId?._id) {
      const userIdStr = website.userId._id.toString();
      emitToUser(userIdStr, 'website-status-changed', eventData);
    }

    emitToWebsite(websiteId, 'status-update', eventData);

    return true;
  } catch (error) {
    console.error(`❌ [SOCKET] Failed to emit website status change: ${error.message}`);
    return false;
  }
};

export const emitMonitoringBatchComplete = (results) => {
  try {
    const io = getIO();
    
    io.emit('monitoring-batch-complete', {
      total: results.total,
      up: results.up,
      down: results.down,
      slow: results.slow,
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error(`❌ [SOCKET] Failed to emit batch complete: ${error.message}`);
    return false;
  }
};

export const emitAlert = (userId, alertData) => {
  try {
    emitToUser(userId, 'alert-new', {
      ...alertData,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error(`❌ [SOCKET] Failed to emit alert: ${error.message}`);
    return false;
  }
};

export const emitHealthUpdate = (websiteId, healthData) => {
  try {
    emitToWebsite(websiteId, 'health-update', {
      ...healthData,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error(`❌ [SOCKET] Failed to emit health update: ${error.message}`);
    return false;
  }
};