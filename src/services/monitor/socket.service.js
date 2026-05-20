import { getIO } from '../../socket/index.js';

export const emitStatusUpdate = async (userId, monitorId, checkResult, previousStatus) => {
  try {
    const io = getIO();
    if (!io) return;

    const roomId = `user:${userId.toString()}`;
    const payload = {
      websiteId: monitorId,
      status: checkResult.status,
      responseTime: checkResult.responseTime,
      statusCode: checkResult.statusCode,
      previousStatus
    };

    // Safely emit ONLY to the specific user's secure room
    io.to(roomId).emit('website-status-changed', payload);
    
    // Also emit to the website-specific room for detail pages
    io.to(`website:${monitorId}`).emit('status-update', payload);
  } catch (error) {
    console.error(`[SOCKET] Broadcast failed: ${error.message}`);
  }
};

export const emitBatchComplete = async (userId, batchStats) => {
  try {
    const io = getIO();
    if (!io) return;

    io.to(`user:${userId.toString()}`).emit('monitoring-batch-complete', batchStats);
  } catch (error) {
    console.error(`[SOCKET] Batch broadcast failed: ${error.message}`);
  }
};
