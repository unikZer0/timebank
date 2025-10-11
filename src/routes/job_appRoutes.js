import express from 'express';
import {postJobApp,getJobAppsByUser,updateJobAppStatus} from "../controllers/job_appController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/jobapp', authMiddleware, postJobApp);
router.get('/jobapp/user/:userId', authMiddleware, getJobAppsByUser);
router.put('/jobapp/:id/status', authMiddleware, updateJobAppStatus);

export default router;
