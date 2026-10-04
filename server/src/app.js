import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// Standard CORS & Body Parser
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Security & Referrer policy (Crucial for embedded YouTube player without error 153)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Mount API routes
app.use(apiRoutes);

// Static Web App Serving
const webRoot = path.join(__dirname, '..', '..', 'web');
app.use(
  express.static(webRoot, {
    maxAge: '1d',
    etag: true,
    index: 'index.html',
  }),
);

// SPA Fallback for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(webRoot, 'index.html'));
});

// Centralized error & 404
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
