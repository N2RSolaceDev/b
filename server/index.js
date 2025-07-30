import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import xssClean from 'xss-clean';
import User from './models/User.js';
import Request from './models/Request.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-ultra-secure-jwt-secret-change-in-prod';

// 🔐 Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Prevent XSS, secure headers
app.use(xssClean()); // Strip XSS scripts from body
app.use(express.json({ limit: '10kb' })); // Prevent large payloads

// 🌐 CORS (Production-ready)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// 🛑 Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts
  message: { error: 'Too many login attempts, try again later.' }
});

app.use('/', generalLimiter);
app.use('/api/auth', authLimiter);

// 🧹 Sanitize Input (Anti-NoSQL Injection)
const sanitizeInput = (req, res, next) => {
  const clean = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    Object.keys(obj).forEach(key => {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      }
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean(obj[key]);
      }
    });
  };
  clean(req.body);
  next();
};

app.use(sanitizeInput);

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/siteflow');
console.log('MongoDB connected securely');

// 🔑 Login + First-Time Setup
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.isSetup) {
      return res.json({ mustSetPassword: true, email: user.email });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      isAdmin: user.isAdmin,
      displayName: user.displayName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
