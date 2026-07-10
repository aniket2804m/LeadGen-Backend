import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import {
  getEnrolledCourses,
  getCourseProgress,
  getPurchaseHistory,
  updateProfile,
  changePassword,
} from "../controllers/userDashboardController.js";

const router = express.Router();

// All routes require login
router.use(verifyToken);

router.get("/enrolled-courses", getEnrolledCourses);
router.get("/progress", getCourseProgress);
router.get("/purchases", getPurchaseHistory);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

export default router;