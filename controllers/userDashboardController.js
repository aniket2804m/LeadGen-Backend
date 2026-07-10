// controllers/userDashboardController.js
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

// GET /api/user/enrolled-courses
export const getEnrolledCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "enrolledCourses",
      select: "title description thumbnail category amenities price images",
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const courses = user.enrolledCourses.map(course => ({
      ...course.toObject(),
      progress: user.courseProgress?.find(
        p => p.course?.toString() === course._id.toString()
      )?.percentage || 0,
    }));

    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/user/progress
export const getCourseProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("enrolledCourses");
    if (!user) return res.status(404).json({ message: "User not found" });

    const progressData = user.enrolledCourses.map(course => {
      const prog = user.courseProgress?.find(
        p => p.course?.toString() === course._id.toString()
      );
      return {
        _id: course._id,
        title: course.title,
        category: course.amenities || "General",
        totalLessons: course.totalLessons || 20,
        completedLessons: prog?.completedLessons || 0,
        lastAccessed: prog?.lastAccessed || new Date(),
      };
    });

    res.json(progressData);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/user/purchases
export const getPurchaseHistory = async (req, res) => {
  try {
    // Order model nahi hai abhi — empty array return karo
    res.json([]);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/user/profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, bio },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/user/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};