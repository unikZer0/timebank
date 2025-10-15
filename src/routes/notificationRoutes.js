import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { 
  getUserNotifications, 
  markAsRead, 
  getUnreadCount 
} from "../controllers/notificationController.js";

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

// Get user's notifications
router.get("/", getUserNotifications);

// Mark notification as read
router.patch("/:notificationId/read", markAsRead);

// Get unread notification count
router.get("/unread-count", getUnreadCount);

export default router;
