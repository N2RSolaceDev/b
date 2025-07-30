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
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-ultra-secure-jwt-secret-change-in-prod';

// 🔐 Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_BUILD_PATH = path.join(__dirname, '../../client/dist');

// 🔐 Security Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(xssClean());
app.use(express.json({ limit: '10kb' }));

// 🌐 CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// 🛑 Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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

// 🔐 Set Password (First Login)
app.post('/api/auth/set-password', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, isSetup: false });
    if (!user) return res.status(400).json({ error: 'Account not found or already set up' });

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.isSetup = true;
    user.displayName = user.displayName || email.split('@')[0];
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// 📂 Get My Requests
app.get('/api/requests/mine', verifyAuth, async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 📤 Create Request
app.post('/api/requests', verifyAuth, [
  body('type').trim().escape().notEmpty().isLength({ max: 100 }),
  body('description').trim().escape().notEmpty().isLength({ max: 1000 }),
  body('budget').optional().isFloat({ min: 1, max: 10000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  const { type, description, budget } = req.body;

  try {
    const request = new Request({
      userId: req.userId,
      type,
      description,
      budget: budget ? parseFloat(budget) : undefined
    });

    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// 👮 Admin: Get All Requests
app.get('/api/admin/requests', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const requests = await Request.aggregate([
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $addFields: { userEmail: '$user.email' } },
      { $project: { user: 0 } },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 💬 Admin: Quote Request + Inject BuyMeACoffee Link
app.put('/api/admin/requests/:id/quote', verifyAuth, requireAdmin, [
  body('price').isFloat({ min: 1, max: 10000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  const { price } = req.body;

  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const admin = await User.findById(req.userId);
    if (!admin.bmacLink) {
      return res.status(400).json({ error: 'You must set your BuyMeACoffee link in settings' });
    }

    request.price = price;
    request.bmacLink = admin.bmacLink;
    request.status = 'quoted';
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to quote request' });
  }
});

// 👮 Admin: Set BuyMeACoffee Link
app.put('/api/admin/profile', verifyAuth, requireAdmin, [
  body('bmacLink').isURL().matches(/^https:\/\/buymeacoffee\.com\/[a-zA-Z0-9_-]+$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Must be a valid BuyMeACoffee profile link' });
  }

  const { bmacLink } = req.body;

  try {
    const admin = await User.findById(req.userId);
    admin.bmacLink = bmacLink;
    await admin.save();

    res.json({ success: true, bmacLink });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// 🔐 Middleware
function verifyAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.userId = payload.id;
    req.isAdmin = payload.isAdmin;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// 🔺 Serve React App (Production)
app.use(express.static(CLIENT_BUILD_PATH));

// All non-API routes serve React app
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: CLIENT_BUILD_PATH });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api/health`);
});
