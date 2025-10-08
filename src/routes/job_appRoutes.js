import express from 'express';
import {postJobApp,getJobAppsByUser,updateJobAppStatus} from "../controllers/job_appController.js";

const router = express.Router();

router.post('/jobapp', postJobApp);
router.get('/jobapp/user/:userId',getJobAppsByUser);
router.put('/jobapp/:id/status',updateJobAppStatus);

export default router;
