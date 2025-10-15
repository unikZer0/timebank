import express from 'express';
import {
    createJob,
    getJobs,
    getJobById,
    getJobsByUser,
    updateJob,
    deleteJob,
    broadcastJob,
} from '../controllers/jobController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes (broadcasted jobs only)
router.get('/jobs', getJobs);
router.get('/jobs/:id', getJobById);

// Protected routes (require authentication)
router.post('/jobs', authMiddleware, createJob);
router.get('/jobs/user/my-jobs', authMiddleware, getJobsByUser);
router.put('/jobs/:id', authMiddleware, updateJob);
router.delete('/jobs/:id', authMiddleware, deleteJob);
router.put('/jobs/:id/broadcast', authMiddleware, broadcastJob);

export default router;
