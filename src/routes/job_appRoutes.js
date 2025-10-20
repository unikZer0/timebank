import express from 'express';
import {postJobApp,getJobAppsByUser,updateJobAppStatus, getJobApplications, getMyJobApplications} from "../controllers/job_appController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/jobapp', authMiddleware, postJobApp);
router.get('/jobapp/user/me', authMiddleware, getMyJobApplications);
router.get('/jobapp/user/:userId', authMiddleware, getJobAppsByUser);
router.put('/jobapp/:id/status', authMiddleware, updateJobAppStatus);
router.get('/jobs/:jobId/applications', authMiddleware, getJobApplications);
router.get('/jobapp', authMiddleware, getAllJobApps);

export default router;
