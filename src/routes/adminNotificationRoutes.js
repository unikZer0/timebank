import express from 'express';
import { getAdminNotificationList } from '../controllers/adminNotificationController.js';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/admin', authMiddleware, requireAdmin, getAdminNotificationList);

export default router;