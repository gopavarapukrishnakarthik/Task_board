const express = require("express");
const Task = require("../models/Task");
const { verifyToken, requireLead } = require("../middleware/authMiddleware");

const router = express.Router();

// Utility: build query for search & filters
function buildQuery({ status, search, due }) {
  const query = {};
  if (status) query.status = status; // filter by status
  if (search) query.title = { $regex: search, $options: "i" }; // case-insensitive search
  if (due === "overdue") query.dueDate = { $lt: new Date() };
  if (due === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query.dueDate = { $gte: start, $lte: end };
  }
  return query;
}

// Get all tasks (with search & filters)
router.get("/", verifyToken, async (req, res) => {
  try {
    const query = buildQuery(req.query);

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email") // ✅ now always included
      .populate("history.changedBy", "name email")
      .sort({ createdAt: -1 });

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
    const { title, description, assignedTo, dueDate } = req.body;
    const task = await Task.create({
      title,
      description,
      dueDate,
      assignedTo,
      createdBy: req.user.userId || req.user.id, // ✅ store creator
    });

    // 🔥 Emit socket event
    req.io.emit("taskCreated", task);

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

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (update.status && update.status !== task.status) {
      task.history.push({
        status: update.status,
        changedBy: req.user.userId || req.user.id, // ✅ track updater
        changedAt: new Date(),
        reason: update.reasonForDelay || "",
      });
      task.status = update.status;
      task.reasonForDelay = update.reasonForDelay || "";
    }

    if (update.title) task.title = update.title;
    if (update.description) task.description = update.description;
    if (update.assignedTo) task.assignedTo = update.assignedTo;
    if (update.dueDate) task.dueDate = update.dueDate;

    await task.save();

    // 🔥 Emit socket event
    req.io.emit("taskUpdated", task);

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

    // 🔥 Emit socket event
    req.io.emit("taskDeleted", req.params.id);

    res.json({ message: "Task deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting task", error: err.message });
  }
});

// Get tasks assigned to logged-in user
router.get("/my-tasks", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user.userId || req.user.id,
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching user tasks", error: err.message });
  }
});

module.exports = router;
