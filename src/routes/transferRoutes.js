import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
    transferHours,
    getTransferHistoryCtrl,
    getFamilyMembersCtrl,
    getWalletBalanceCtrl
} from "../controllers/transferCtrl.js";

const router = express.Router();
router.use(authMiddleware);
router.post('/transfer', transferHours);
router.get('/transfer/history', getTransferHistoryCtrl);
router.get('/transfer/family', getFamilyMembersCtrl);
router.get('/wallet/balance', getWalletBalanceCtrl);

export default router;
