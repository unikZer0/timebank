import express from 'express';
import { getJobApplicants } from "../controllers_admin/admin_matchController.js";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get('/admin/jobs/:job_id/applicants', authMiddleware, requireAdmin, getJobApplicants);

export default router;
