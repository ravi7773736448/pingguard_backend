import rateLimit from 'express-rate-limit';

const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
    errors: [{
      field: 'rate_limit',
      message: `Rate limit exceeded. Try again in ${Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000)} seconds`
    }]
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts',
    errors: [{ field: 'auth', message: 'Please wait 15 minutes before trying again' }]
  },
  handler: rateLimitHandler
});

export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many analytics requests',
    errors: [{ field: 'analytics', message: 'Please wait 1 minute before requesting more' }]
  },
  handler: rateLimitHandler
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests',
    errors: [{ field: 'rate_limit', message: 'Please slow down' }]
  },
  handler: rateLimitHandler
});

export const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests',
    errors: [{ field: 'rate_limit', message: 'Please wait before creating more' }]
  },
  handler: rateLimitHandler
});

export default {
  authLimiter,
  analyticsLimiter,
  generalLimiter,
  createLimiter
};