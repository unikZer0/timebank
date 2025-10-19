import express from 'express';
import { getUserTransactions } from '../controllers/transactionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get user's transactions
router.get('/transactions', authMiddleware, getUserTransactions);

export default router;
