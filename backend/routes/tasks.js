const express = require("express");
const Task = require("../models/Task");
const { verifyToken, requireLead } = require("../middleware/authMiddleware");

const router = express.Router();

// Utility: build query for search & filters
function buildQuery({ status, search, due }) {
  const query = { deleted: false }; // ✅ exclude deleted tasks by default
  if (status) query.status = status;
  if (search) query.title = { $regex: search, $options: "i" };
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

// Get all active tasks
router.get("/", verifyToken, async (req, res) => {
  try {
    const query = buildQuery(req.query);

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
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
      createdBy: req.user.userId || req.user.id,
    });

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

    if (!task || task.deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (update.status && update.status !== task.status) {
      task.history.push({
        status: update.status,
        changedBy: req.user.userId || req.user.id,
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

    req.io.emit("taskUpdated", task);
    res.json(task);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating task", error: err.message });
  }
});

// ✅ Soft Delete a task (Lead only)
router.delete("/:id", verifyToken, requireLead, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.deleted = true;
    task.deletedBy = req.user.userId || req.user.id;
    task.deletedAt = new Date();

    await task.save();

    req.io.emit("taskDeleted", req.params.id);
    res.json({ message: "Task moved to trash", task });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting task", error: err.message });
  }
});

// ✅ Restore task (Lead only)
router.put("/:id/restore", verifyToken, requireLead, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.deleted) {
      return res.status(404).json({ message: "Task not found or not deleted" });
    }

    task.deleted = false;
    task.deletedBy = null;
    task.deletedAt = null;

    await task.save();
    req.io.emit("taskRestored", task);
    res.json({ message: "Task restored", task });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error restoring task", error: err.message });
  }
});

// ✅ Get Deleted Tasks (Lead only)
router.get("/deleted/all", verifyToken, requireLead, async (req, res) => {
  try {
    const tasks = await Task.find({ deleted: true })
      .populate("deletedBy", "name email")
      .sort({ deletedAt: -1 });

    res.json(tasks);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching deleted tasks", error: err.message });
  }
});

// Get tasks assigned to logged-in user
router.get("/my-tasks", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user.userId || req.user.id,
      deleted: false,
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
