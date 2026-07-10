import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import { authorizeRole } from "../middleware/authorizeRole.js";

const router = express.Router();

router.delete(
  "/delete/:id",
  verifyToken,
  authorizeRole("admin"),
  (req, res) => {
    res.json({ message: "Deleted successfully" });
  }
);

export default router;
