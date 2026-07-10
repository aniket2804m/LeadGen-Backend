import mongoose from "mongoose";

const courseEnquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
  },
  message: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const CourseEnquiry = mongoose.model("CourseEnquiry", courseEnquirySchema);

export default CourseEnquiry;
