const mongoose = require("mongoose");

const jiraTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      default: "InProgress",
      enum: ["InProgress", "Waiting for customer", "Escalated", "Closed"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cpVersion: { type: String, default: "" },
    site: { type: String, default: "" },
    environment: { type: String, default: "" },
    filesReceived: { type: String, default: "" },
    affectedComponents: { type: String, default: "" },
    rca: { type: String, default: "" },
    notes: { type: String, default: "" },
    keyPoints: { type: String, default: "" },
    history: [
      {
        field: { type: String },
        oldValue: { type: String, default: "" },
        value: { type: String, default: "" },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        changedByName: { type: String, default: "Unknown" },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("JiraTicket", jiraTicketSchema);
