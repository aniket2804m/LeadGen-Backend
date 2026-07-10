import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import { isAdmin } from "../middleware/authorizeRole.js";
import {
  getAllCourses, createCourse, updateCourse, deleteCourse,
  getAllUsers, toggleBlockUser,
  getAnalytics, getAllEnquiries, deleteEnquiry
} from "../controllers/adminControllers.js";

const router = express.Router();

// All routes require login + admin role
router.use(verifyToken, isAdmin);

// ── Listings/Courses ──────────────────────────────────────
router.get("/courses", getAllCourses);
router.post("/courses", createCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

// ── Users ─────────────────────────────────────────────────
router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleBlockUser);

// ── Analytics ─────────────────────────────────────────────
router.get("/analytics", getAnalytics);

// Form Enquirey data 
router.get("/enquiries", getAllEnquiries);
router.delete("/enquiries/:id", deleteEnquiry);

export default router;