const express = require("express");
const Task = require("../models/Task");
const { verifyToken, requireLead } = require("../middleware/authMiddleware");

const router = express.Router();

// Get all tasks
router.get("/", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find().populate("createdBy assignedTo");
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
    const task = await Task.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
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
