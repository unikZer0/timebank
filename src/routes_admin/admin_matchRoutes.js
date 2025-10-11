import express from 'express';
import { getJobApplicants, getAdminJobs, createAdminMatch, getAdminMatches, updateAdminMatch, deleteAdminMatch, updateJobApplicationStatus } from "../controllers_admin/admin_matchController.js";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get('/admin/jobs', authMiddleware, requireAdmin, getAdminJobs);
router.get('/admin/jobs/:job_id/applicants', authMiddleware, requireAdmin, getJobApplicants);

router.post('/admin/matches', authMiddleware, requireAdmin, createAdminMatch);
router.get('/admin/matches', authMiddleware, requireAdmin, getAdminMatches);
router.put('/admin/matches/:id', authMiddleware, requireAdmin, updateAdminMatch);
router.delete('/admin/matches/:id', authMiddleware, requireAdmin, deleteAdminMatch);

router.put('/admin/job-applications/:id', authMiddleware, requireAdmin, updateJobApplicationStatus);

export default router;
