import express from "express";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";
import { getDashboardStats, getDashboardMonthlyStats } from "../controllers_admin/dashboard.js";

const router = express.Router();

router.get('/admin/dashboard', authMiddleware, requireAdmin, getDashboardStats);
router.get('/admin/dashboard/stats', authMiddleware, requireAdmin, getDashboardMonthlyStats);

export default router;


