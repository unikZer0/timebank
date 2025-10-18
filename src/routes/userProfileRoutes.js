import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getUserProfile } from "../controllers/userProfileController.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user profile
router.get('/profile', getUserProfile);

export default router;
