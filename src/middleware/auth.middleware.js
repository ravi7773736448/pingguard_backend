import jwt from 'jsonwebtoken';
import { Config } from '../config/config.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const decoded = jwt.verify(token, Config.JWT_SECRET);
    
    req.user = {
      userId: decoded.id || decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token'
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, Config.JWT_SECRET);
      req.user = { 
        userId: decoded.id || decoded.userId, 
        email: decoded.email 
      };
    }
    
    next();
  } catch (error) {
    next();
  }
};