if (!process.env.VERCEL) {
  require('dotenv').config();
}

const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');

console.log('🚀 Initializing watch store backend...');

const frontendPath = path.resolve(__dirname, '..', 'frontend');

const MONGODB_URI = process.env.MONGODB_URI;

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Load API routes
  try {
    const productRoutes = require('./routes/products');
    const orderRoutes = require('./routes/orders');

    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);

    console.log('✅ Routes loaded');
  } catch (error) {
    console.error('❌ Error loading routes:', error);
    throw error;
  }

  const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || 'HWStore@2026';

  const LEGACY_ADMIN_PASSWORD =
    process.env.LEGACY_ADMIN_PASSWORD || 'ChronoVault@2026';

  function requireAdminAccess(req, res, next) {
    const isAdminRoute =
      req.path === '/admin' ||
      req.path === '/admin.html' ||
      req.path === '/orders' ||
      req.path === '/orders.html';

    if (!isAdminRoute) {
      return next();
    }

    const submittedPassword = req.query.password || '';

    if (
      submittedPassword === ADMIN_PASSWORD ||
      submittedPassword === LEGACY_ADMIN_PASSWORD
    ) {
      return next();
    }

    res.type('html').send(`
      <html>
        <body style="font-family:Arial,sans-serif; padding:40px; background:#111; color:#fff;">
          <h2>Admin Access</h2>
          <p>Enter the password to continue.</p>

          <form method="get">
            <input
              type="password"
              name="password"
              placeholder="Password"
              style="padding:10px; width:220px;"
              required
            />

            <button
              type="submit"
              style="padding:10px 14px;"
            >
              Enter
            </button>
          </form>
        </body>
      </html>
    `);
  }

  app.use(requireAdminAccess);

  app.get('/login', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
  });

  app.get(['/admin', '/admin.html'], (req, res) => {
    res.sendFile(path.join(frontendPath, 'admin.html'));
  });

  app.get(['/orders', '/orders.html'], (req, res) => {
    res.sendFile(path.join(frontendPath, 'orders.html'));
  });

  app.use(express.static(frontendPath));

  app.get('/', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');

    res.sendFile(indexPath, (error) => {
      if (error) {
        res.status(200).send('Watch Store API');
      }
    });
  });

  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'Premium Watch Store API is running',
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database:
        mongoose.connection.readyState === 1
          ? 'connected'
          : 'disconnected',
      uptime: process.uptime(),
    });
  });

  // Multer / general error handler
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err);

    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Server error',
      });
    }

    next();
  });

  // API 404
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
      });
    }

    res.status(404).send('Page not found');
  });

  return app;
}

let dbPromise = null;

function connectDB() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not configured.');
    return Promise.resolve(null);
  }

  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }

  if (mongoose.connection.readyState === 2 && dbPromise) {
    return dbPromise;
  }

  dbPromise = mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    })
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return mongoose.connection;
    })
    .catch((error) => {
      console.error(
        '⚠️ MongoDB connection error:',
        error.message
      );

      return null;
    });

  return dbPromise;
}

function startServer(
  port = Number(process.env.PORT) || 5001
) {
  const server = app.listen(port, () => {
    console.log(
      `✅ Server running at http://127.0.0.1:${port}`
    );
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;

      console.log(
        `⚠️ Port ${port} is busy. Trying ${fallbackPort}...`
      );

      startServer(fallbackPort);
      return;
    }

    console.error('❌ Server Error:', err.message);
    process.exit(1);
  });
}

const app = createApp();

module.exports = {
  app,
  createApp,
  connectDB,
  startServer,
};