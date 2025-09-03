const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    status: {
      type: String,
      enum: ["todo", "inprogress", "blocked", "done"],
      default: "todo",
    },
    reasonForDelay: String,
    dueDate: Date,
    deleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

taskSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 } // 30 days
);

module.exports = mongoose.model("Task", taskSchema);
