import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  leadId: {
    type: String,
    required: true,
  },
  name: { type: String, required: true },
  rating: { type: Number, default: null },
  website: { type: String, default: null },
  address: { type: String, default: "" },
  phoneNumber: { type: String, default: null },
  score: { type: String, default: "WARM" },
  reasoning: { type: String, default: "" },
  outreachMessage: { type: String, default: "" },
  status: { type: String, default: "NEW" },
  notes: { type: Array, default: [] },
  auditScore: { type: Number, default: null },
  auditProgress: { type: String, default: "idle" },
  auditData: { type: mongoose.Schema.Types.Mixed, default: null },
}, {
  timestamps: true
});

// Ensure a user cannot have duplicate leadIds
leadSchema.index({ userId: 1, leadId: 1 }, { unique: true });

const meetingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  meetingId: {
    type: String,
    required: true,
  },
  leadId: { type: String, required: true },
  leadName: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  type: { type: String, default: "virtual" },
  notes: { type: String, default: "" },
}, {
  timestamps: true
});

meetingSchema.index({ userId: 1, meetingId: 1 }, { unique: true });

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  invoiceId: {
    type: String,
    required: true,
  },
  leadId: { type: String, required: true },
  leadName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: "UNPAID" },
  dueDate: { type: String, required: true },
}, {
  timestamps: true
});

invoiceSchema.index({ userId: 1, invoiceId: 1 }, { unique: true });

export const Lead = mongoose.model("Lead", leadSchema);
export const Meeting = mongoose.model("Meeting", meetingSchema);
export const Invoice = mongoose.model("Invoice", invoiceSchema);
