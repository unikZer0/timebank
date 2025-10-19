import express from 'express';
import { getJobApplicants, getAdminJobs, getJobsForMatching, createAdminMatch, getAdminMatches, updateAdminMatch, deleteAdminMatch, updateJobApplicationStatus, getSkilledUsersForJob } from "../controllers_admin/admin_matchController.js";
import { getUsersWithLineIdEndpoint } from "../controllers_admin/usersController.js";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get('/admin/jobs', authMiddleware, requireAdmin, getAdminJobs);
router.get('/admin/jobs-for-matching', authMiddleware, requireAdmin, getJobsForMatching);
router.get('/admin/jobs/:job_id/applicants', authMiddleware, requireAdmin, getJobApplicants);
router.get('/admin/jobs/:job_id/skilled-users', authMiddleware, requireAdmin, getSkilledUsersForJob);

router.get('/admin/users-with-line-id', authMiddleware, requireAdmin, getUsersWithLineIdEndpoint);

router.post('/admin/matches', authMiddleware, requireAdmin, createAdminMatch);
router.get('/admin/matches', authMiddleware, requireAdmin, getAdminMatches);
router.put('/admin/matches/:id', authMiddleware, requireAdmin, updateAdminMatch);
router.delete('/admin/matches/:id', authMiddleware, requireAdmin, deleteAdminMatch);

router.put('/admin/job-applications/:id', authMiddleware, requireAdmin, updateJobApplicationStatus);

export default router;