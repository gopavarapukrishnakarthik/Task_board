const express = require("express");
const axios = require("axios");
const { verifyToken } = require("../middleware/authMiddleware");
const JiraTicket = require("../models/JiraTicket");
const router = express.Router();
require("dotenv").config();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const authHeader = {
  Authorization:
    "Basic " +
    Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64"),
  Accept: "application/json",
};

// Allowed statuses for board and schema
const ALLOWED_STATUSES = ["InProgress", "Waiting for customer", "Escalated"];

// 🔹 Fetch BIOT tickets (Realtime from Jira)
router.get("/board-issues", verifyToken, async (req, res) => {
  try {
    const jql = `project = BIOT ORDER BY created DESC`;

    const response = await axios.get(
      `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(
        jql
      )}&maxResults=500`,
      { headers: authHeader }
    );

    const issues = response.data.issues
      .map((issue) => {
        const status = issue.fields.status?.name || "InProgress";

        if (!ALLOWED_STATUSES.includes(status)) return null;

        return {
          _id: issue.id,
          ticketNumber: issue.key,
          title: issue.fields.summary,
          description:
            issue.fields.description?.plainText ||
            issue.fields.description?.content?.[0]?.content?.[0]?.text ||
            "",
          status,
          assignedTo: issue.fields.assignee ? issue.fields.assignee.id : null,
          assignedToName: issue.fields.assignee?.displayName || "Unassigned",
          dueDate: issue.fields.duedate || null,
          history: [],
        };
      })
      .filter(Boolean);

    res.json(issues);
  } catch (err) {
    console.error("Jira API error:", err.response?.data || err.message);
    res.status(500).json({ message: "Error fetching Jira issues" });
  }
});

// 🔹 Update Jira ticket by ticketNumber
router.put("/update-ticket/:ticketNumber", verifyToken, async (req, res) => {
  try {
    const { ticketNumber } = req.params;

    let ticket = await JiraTicket.findOne({ ticketNumber });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found in DB" });
    }

    const updaterId = req.user.userId || req.user.id;
    const updaterName = req.user.name || "Unknown";

    const allowedFields = [
      "cpVersion",
      "site",
      "environment",
      "filesReceived",
      "affectedComponents",
      "rca",
      "notes",
      "status",
      "keyPoints",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== ticket[field]) {
        // Sanitize status
        if (field === "status" && !ALLOWED_STATUSES.includes(req.body[field])) {
          return; // skip invalid status
        }

        ticket.history.push({
          field,
          oldValue: ticket[field],
          value: req.body[field],
          changedBy: updaterId,
          changedByName: updaterName,
          changedAt: new Date(),
        });

        ticket[field] = req.body[field];
      }
    });

    await ticket.save();

    // Emit via Socket.IO if available
    if (req.io) req.io.emit("ticketUpdated", ticket);

    res.json(ticket);
  } catch (err) {
    console.error("Error updating ticket:", err.response?.data || err.message);
    res.status(500).json({
      message: "Error updating ticket",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
