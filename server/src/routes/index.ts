import { type Router as ExpressRouter, Router } from 'express';

import { aiRoutes } from '@/routes/ai.js';
import { authRoutes } from '@/routes/auth.js';
import { contactRoutes } from '@/routes/contact.js';
import { embedDataRoutes } from '@/routes/embedData.js';
import { paymentRoutes } from '@/routes/payments.js';
import { projectRoutes } from '@/routes/projects.js';
import { sheetsRoutes } from '@/routes/sheets.js';

const router: ExpressRouter = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

// Public embed JSON (CORS-enabled)
router.use(embedDataRoutes);

// Auth routes
router.use('/auth', authRoutes);

// Contact routes
router.use('/contact', contactRoutes);

// Project routes
router.use('/payments', paymentRoutes);
router.use('/projects', projectRoutes);

// Google Sheets routes
router.use('/sheets', sheetsRoutes);

// AI routes (Explorer plan and above)
router.use('/ai', aiRoutes);

export const apiRoutes: ExpressRouter = router;
