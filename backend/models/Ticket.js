const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    keyPoints: String,
    status: {
      type: String,
      enum: ["support", "waiting", "engineering"],
      default: "support",
    },
    closed: { type: Boolean, default: false },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    history: [
      {
        status: String,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
