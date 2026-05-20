import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Config } from '../config/config.js';
import Website from '../models/website.model.js';

let io;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://pingguard-frontend.vercel.app',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    allowEIO4: true
  });

  // Secure Auth Middleware for Sockets
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      let token = socket.handshake.auth?.token;

      // Extract from cookies if present
      if (!token && cookieHeader) {
        const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

      if (token) {
        const decoded = jwt.verify(token, Config.JWT_SECRET);
        socket.user = decoded;
      }
      next();
    } catch (err) {
      // Non-blocking authentication: don't reject connection entirely to support all environments,
      // but do not populate socket.user, preventing sensitive room actions.
      next();
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-dashboard', (userId) => {
      if (!userId) return;
      
      const authenticatedUserId = socket.user?.id || socket.user?._id;
      if (authenticatedUserId && userId.toString() === authenticatedUserId.toString()) {
        socket.join(`user:${userId}`);
        console.log(`🔌 Securely joined room user:${userId} for socket ${socket.id}`);
      } else {
        console.warn(`⚠️ Security alert: Socket ${socket.id} attempted to join user:${userId} without valid authorization!`);
      }
    });

    socket.on('subscribe-website', async (websiteId) => {
      if (!websiteId) return;

      const authenticatedUserId = socket.user?.id || socket.user?._id;
      if (!authenticatedUserId) {
        console.warn(`⚠️ Security alert: Unauthenticated socket attempted to subscribe to website:${websiteId}`);
        return;
      }

      try {
        // Enforce that the user must own the monitor to receive its telemetry updates
        const website = await Website.findOne({ _id: websiteId, userId: authenticatedUserId });
        if (website) {
          socket.join(`website:${websiteId}`);
          console.log(`🔌 Securely joined room website:${websiteId} for socket ${socket.id}`);
        } else {
          console.warn(`⚠️ Security alert: User ${authenticatedUserId} attempted unauthorized access to website:${websiteId}`);
        }
      } catch (err) {
        console.error(`[SOCKET] Subscription authentication error: ${err.message}`);
      }
    });

    socket.on('unsubscribe-website', (websiteId) => {
      if (websiteId) {
        socket.leave(`website:${websiteId}`);
        console.log(`🔌 Unsubscribed from website:${websiteId}`);
      }
    });

    socket.on('error', (error) => {
      console.error(`[SOCKET] Error for ${socket.id}:`, error.message);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (!io) {
    console.error('❌ [SOCKET] io not initialized - cannot emit to user');
    return false;
  }
  io.to(`user:${userId}`).emit(event, data);
  return true;
};

export const emitToWebsite = (websiteId, event, data) => {
  if (!io) {
    console.error('❌ [SOCKET] io not initialized - cannot emit to website');
    return false;
  }
  io.to(`website:${websiteId}`).emit(event, data);
  return true;
};

export const emitToAll = (event, data) => {
  if (!io) {
    console.error('❌ [SOCKET] io not initialized - cannot emit to all');
    return false;
  }
  // Enforce zero global broadcasts of user telemetry updates
  if (event === 'website-status-changed') {
    console.warn(`🔒 Blocked global broadcast of sensitive event: ${event}`);
    return false;
  }
  io.emit(event, data);
  return true;
};