import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.route.js';
import websiteRouter from './routes/website.route.js';
import reviewRouter from './routes/review.route.js';
import { getCronStatus } from './jobs/monitor.job.js';
import { initializeSocket } from './socket/index.js';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import passport from 'passport';
import './config/redis.js';
import { Config } from './config/config.js';
import User from './models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(cors({
  origin: [
    "https://pingguard-frontend.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));



app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(passport.initialize());

passport.use(new GoogleStrategy({
  clientID: Config.CLIENT_ID,
  clientSecret: Config.CLIENT_SECRET,
  callbackURL: "https://pingguard-backend.onrender.com/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found from Google'), null);
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        googleId: profile.id,
        username: profile.displayName || email.split('@')[0],
        email: email,
        avatar: profile.photos?.[0]?.value
      });
    } else if (!user.googleId) {
      user.googleId = profile.id;
      if (profile.photos?.[0]?.value) user.avatar = profile.photos[0].value;
      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/website', websiteRouter);
app.use('/api/reviews', reviewRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version
  });
});

app.get('/health/monitoring', (req, res) => {
  const cronStatus = getCronStatus();
  res.status(200).json({
    status: 'ok',
    cron: cronStatus
  });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, '| Path:', req.path, '| Method:', req.method);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation failed',
      errors: err.errors || []
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      errors: [{ field: 'id', message: 'Invalid MongoDB ObjectId format' }]
    });
  }

  if (err.name === 'SyntaxError' && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      errors: [{ field: 'body', message: 'Malformed JSON payload' }]
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors: [{ field, message: `This ${field} already exists` }]
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      errors: [{ field: 'token', message: 'Authentication token is invalid' }]
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      errors: [{ field: 'token', message: 'Please login again' }]
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { errors: [{ message: err.message }] })
  });
});

export default app;
export { server };