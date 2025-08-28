const express = require("express");
const Task = require("../models/Task");
const { verifyToken, requireLead } = require("../middleware/authMiddleware");

const router = express.Router();

// Get all tasks
router.get("/", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("assignedTo", "name email") // ✅ assignedTo user info
      .populate("history.changedBy", "name email"); // ✅ history user info

    res.json(tasks);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: err.message });
  }
});

// Create a new task
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;
    const task = await Task.create({
      title,
      description,
      createdBy: req.user.id,
      assignedTo,
    });
    res.json(task);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating task", error: err.message });
  }
});

// Update a task
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const update = req.body;
    const task = await Task.findById(req.params.id).populate(
      "history.changedBy",
      "name"
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // If status is changing, log it in history
    if (update.status && update.status !== task.status) {
      task.history.push({
        status: update.status,
        changedBy: req.user.userId,
        changedAt: new Date(),
        reason: update.reasonForDelay || "",
      });
      task.status = update.status;
      task.reasonForDelay = update.reasonForDelay || "";
    }

    // Update other fields
    if (update.title) task.title = update.title;
    if (update.description) task.description = update.description;
    if (update.assignedTo) task.assignedTo = update.assignedTo;

    await task.save();
    res.json(task);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating task", error: err.message });
  }
});

// Delete a task (Lead only)
router.delete("/:id", verifyToken, requireLead, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting task", error: err.message });
  }
});

module.exports = router;
