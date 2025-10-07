import express from "express";
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout
} from "../controllers/authController.js";
import { autoLogin } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { autoLoginMiddleware } from "../middlewares/autoLoginMiddleware.js";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", authMiddleware, logout);
router.get("/auto-login", autoLoginMiddleware, autoLogin);

export default router;

