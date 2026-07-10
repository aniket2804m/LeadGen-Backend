import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  phone: { type: String, default: "" },
  bio: { type: String, default: "" },
  blocked: { type: Boolean, default: false },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing"
  }],
  courseProgress: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    percentage: { type: Number, default: 0 },
    completedLessons: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);

export default User;