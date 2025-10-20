import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getUserProfile, updateUserProfile } from "../controllers/userProfileController.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user profile
router.get('/profile', getUserProfile);

// Update user profile
router.put('/profile', updateUserProfile);

export default router;
