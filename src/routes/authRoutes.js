import express from "express";
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
  updateCurrentLocation,
  getAllSkills,
  searchUserByIdCard,
  lineLoginCallback,
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
router.put("/update-location", authMiddleware, updateCurrentLocation);
router.get("/skills", authMiddleware, getAllSkills);
router.get("/search-by-id-card", authMiddleware, searchUserByIdCard);
router.get("/line/callback", lineLoginCallback);


// //====================== Example admin-only route
// router.delete("/admin/users/:id", authMiddleware, requireAdmin, deleteUser);

// // Example role-based route  
// router.put("/content/:id", authMiddleware, requireRole(['admin', 'moderator']), update);
export default router;

