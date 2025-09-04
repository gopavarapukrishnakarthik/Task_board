const express = require("express");
const Task = require("../models/Task");
const { verifyToken, requireLead } = require("../middleware/authMiddleware");

const router = express.Router();

// Utility: build query for search & filters
function buildQuery({ status, search, due }) {
  const query = { deleted: false }; // exclude deleted tasks by default
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
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("deletedBy", "name email role")
      .populate("history.changedBy", "name email role")
      .populate("history.assignedTo", "name email role")
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

    // Initial history entry
    task.history.push({
      status: "todo",
      assignedTo,
      changedBy: req.user.userId || req.user.id,
      changedAt: new Date(),
    });

    await task.save();

    req.io.emit("taskCreated", await task.populate("assignedTo createdBy"));
    res.json(task);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating task", error: err.message });
  }
});

// Update a task (edit fields but not status directly)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const update = req.body;
    const task = await Task.findById(req.params.id);

    if (!task || task.deleted)
      return res.status(404).json({ message: "Task not found" });

    let historyEntry = null;

    // Track assignedTo change
    if (update.assignedTo && update.assignedTo != String(task.assignedTo)) {
      historyEntry = {
        status: task.status,
        assignedTo: update.assignedTo,
        changedBy: req.user.userId || req.user.id,
        changedAt: new Date(),
      };
      task.assignedTo = update.assignedTo;
      task.history.push(historyEntry);
    }

    // Track other editable fields
    if (update.title) task.title = update.title;
    if (update.description) task.description = update.description;
    if (update.dueDate) task.dueDate = update.dueDate;

    await task.save();

    req.io.emit(
      "taskUpdated",
      await task.populate("assignedTo createdBy history.changedBy")
    );
    res.json(task);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating task", error: err.message });
  }
});

// Soft Delete a task (Lead only)
router.delete("/:id", verifyToken, requireLead, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.deleted)
      return res.status(404).json({ message: "Task not found" });

    task.deleted = true;
    task.deletedBy = req.user.userId || req.user.id;
    task.deletedAt = new Date();
    task.history.push({
      status: "deleted",
      changedBy: req.user.userId || req.user.id,
      changedAt: new Date(),
    });

    await task.save();

    req.io.emit(
      "taskDeleted",
      await task.populate("assignedTo deletedBy history.changedBy")
    );
    res.json({ message: "Task moved to trash", task });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting task", error: err.message });
  }
});

// Restore task (Lead only)
router.put("/:id/restore", verifyToken, requireLead, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.deleted)
      return res.status(404).json({ message: "Task not found or not deleted" });

    // Restore task
    task.deleted = false;
    task.deletedBy = null;
    task.deletedAt = null;

    // Preserve old assigned user if exists, else allow reassignment via req.body
    if (req.body.assignedTo) {
      task.assignedTo = req.body.assignedTo;
    } // else keep task.assignedTo as is (old owner)

    // Add to history
    task.history.push({
      status: "restored",
      changedBy: req.user.userId || req.user.id,
      changedAt: new Date(),
      reason: `Restored by ${req.user.name}`,
      assignedTo: task.assignedTo, // record who it is assigned to after restore
    });

    await task.save();

    // Populate for frontend
    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("deletedBy", "name email role")
      .populate("history.changedBy", "name email role");

    req.io.emit("taskRestored", populatedTask);

    res.json({ message: "Task restored", task: populatedTask });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error restoring task", error: err.message });
  }
});

// Get deleted tasks (Lead only)
router.get("/deleted/all", verifyToken, requireLead, async (req, res) => {
  try {
    const tasks = await Task.find({ deleted: true })
      .populate("deletedBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ deletedAt: -1 });

    res.json(tasks);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching deleted tasks", error: err.message });
  }
});

module.exports = router;
