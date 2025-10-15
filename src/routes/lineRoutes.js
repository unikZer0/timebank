import express from 'express';
import { handleLineWebhookEndpoint } from '../controllers/lineWebhookController.js';
import { getJobMatchDetails, acceptJobMatch, rejectJobMatch } from '../controllers/jobMatchController.js';
import { lineLoginCallback } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// LINE webhook endpoint (no auth required - LINE handles verification)
router.post('/webhook/line', handleLineWebhookEndpoint);

// Test endpoint to verify webhook is accessible
router.get('/webhook/line', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'LINE webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// LINE Login callback endpoint (no auth required - handles OAuth flow)
router.get('/auth/line/callback', lineLoginCallback);

// Job match routes (protected)
router.get('/job-match/:matchId', authMiddleware, getJobMatchDetails);
router.post('/job-match/:matchId/accept', authMiddleware, acceptJobMatch);
router.post('/job-match/:matchId/reject', authMiddleware, rejectJobMatch);

export default router;
