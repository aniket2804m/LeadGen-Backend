import mongoose from "mongoose";

const courseListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
  },
  amenities: {
    type: [String],
    default: [],
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  thumbnail: {
    type: String,
  },
  category: {
    type: String,
  },
  images: {
    type: [String],
    default: [],
  },
  totalLessons: {
    type: Number,
    default: 20,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Listing = mongoose.model("Listing", courseListingSchema);

export default Listing;
