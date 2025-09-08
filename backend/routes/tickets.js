const express = require("express");
const Ticket = require("../models/Ticket");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Create ticket
router.post("/", verifyToken, async (req, res) => {
  try {
    const { ticketNumber, title, description, assignedTo, status, keyPoints } =
      req.body;
    if (!title || !ticketNumber)
      return res
        .status(400)
        .json({ message: "Title and Ticket Number required" });

    const ticket = await Ticket.create({
      ticketNumber,
      title,
      description,
      assignedTo,
      status,
      keyPoints,
      createdBy: req.user.userId || req.user.id,
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("assignedTo", "name")
      .populate("createdBy", "name");

    req.io.emit("ticketCreated", populatedTicket);
    res.json(populatedTicket);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating ticket", error: err.message });
  }
});

// Update ticket (status change, assignedTo, reason)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const update = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Push to history if status or assignedTo changes
    if (update.status || update.assignedTo) {
      ticket.history.push({
        status: update.status || ticket.status,
        assignedTo: update.assignedTo || ticket.assignedTo,
        changedBy: req.user.userId || req.user.id,
        changedAt: new Date(),
        reason: update.reason || "",
      });
    }

    if (update.title) ticket.title = update.title;
    if (update.description) ticket.description = update.description;
    if (update.assignedTo) ticket.assignedTo = update.assignedTo;
    if (update.status) ticket.status = update.status;
    if (update.keyPoints) ticket.keyPoints = update.keyPoints;

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("assignedTo", "name")
      .populate("history.assignedTo", "name")
      .populate("history.changedBy", "name");

    req.io.emit("ticketUpdated", populatedTicket);
    res.json(populatedTicket);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating ticket", error: err.message });
  }
});

// Get all active tickets
router.get("/", verifyToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ closed: false })
      .populate("assignedTo", "name")
      .populate("history.assignedTo", "name")
      .populate("history.changedBy", "name")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tickets", error: err.message });
  }
});

// Get closed tickets
router.get("/closed", verifyToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ closed: true })
      .populate("assignedTo", "name")
      .populate("history.assignedTo", "name")
      .populate("history.changedBy", "name")
      .sort({ updatedAt: -1 });

    res.json(tickets);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching closed tickets", error: err.message });
  }
});

// Close ticket
router.put("/:id/close", verifyToken, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (!req.body.reason)
      return res.status(400).json({ message: "Reason required to close" });

    ticket.closed = true;
    ticket.history.push({
      status: "closed",
      assignedTo: ticket.assignedTo,
      changedBy: req.user.userId || req.user.id,
      changedAt: new Date(),
      reason: req.body.reason,
    });

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("assignedTo", "name")
      .populate("history.assignedTo", "name")
      .populate("history.changedBy", "name");

    req.io.emit("ticketClosed", populatedTicket);
    res.json(populatedTicket);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error closing ticket", error: err.message });
  }
});

// Reopen ticket
router.put("/:id/reopen", verifyToken, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.closed = false;
    ticket.history.push({
      status: "reopened",
      assignedTo: ticket.assignedTo,
      changedBy: req.user.userId || req.user.id,
      changedAt: new Date(),
      reason: `Reopened by ${req.user.name}`,
    });

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("assignedTo", "name")
      .populate("history.assignedTo", "name")
      .populate("history.changedBy", "name");

    req.io.emit("ticketReopened", populatedTicket);
    res.json(populatedTicket);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error reopening ticket", error: err.message });
  }
});

module.exports = router;
