import mongoose from "mongoose";

const searchCacheSchema = new mongoose.Schema({
  city: { type: String, required: true, lowercase: true, trim: true },
  category: { type: String, required: true, lowercase: true, trim: true },
  source: { type: String, required: true, enum: ["osm", "mock", "google"] },
  geocodeFailed: { type: Boolean, default: false },
  leads: { type: mongoose.Schema.Types.Mixed, default: [] },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL: expires in 24 hours (86400 seconds)
}, {
  timestamps: true
});

// Compound index on city and category for fast searches
searchCacheSchema.index({ city: 1, category: 1 }, { unique: true });

const SearchCache = mongoose.model("SearchCache", searchCacheSchema);

export default SearchCache;
