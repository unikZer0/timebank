import express from "express";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";
import { 
    getUnverifiedUsers, 
    getUserDetails, 
    verifyUser, 
    rejectUser 
} from "../controllers_admin/verificationCtrl.js";

const router = express.Router();

router.use(authMiddleware);
router.get('/verification', requireAdmin, getUnverifiedUsers);
router.get('/verification/:userId', requireAdmin, getUserDetails);
router.patch('/verification/:userId/verify', requireAdmin, verifyUser);
router.patch('/verification/:userId/reject', requireAdmin, rejectUser);

export default router;

