// routes/jira.js
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

const ALLOWED_STATUSES = ["InProgress", "Waiting for customer", "Escalated"];

// 🔹 Fetch Jira issues + merge DB fields
router.get("/board-issues", verifyToken, async (req, res) => {
  try {
    const jql = `project = BIOT ORDER BY created DESC`;

    const response = await axios.get(
      `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(
        jql
      )}&maxResults=100`,
      { headers: authHeader }
    );

    const jiraIssues = response.data.issues
      .map((issue) => {
        const status = issue.fields.status?.name || "InProgress";
        if (!ALLOWED_STATUSES.includes(status)) return null;

        return {
          ticketNumber: issue.key,
          title: issue.fields.summary,
          description:
            issue.fields.description?.plainText ||
            issue.fields.description?.content?.[0]?.content?.[0]?.text ||
            "",
          status,
          assignedTo: issue.fields.assignee?.accountId || null,
          assignedToName: issue.fields.assignee?.displayName || "Unassigned",
          dueDate: issue.fields.duedate || null,
        };
      })
      .filter(Boolean);

    const ticketNumbers = jiraIssues.map((i) => i.ticketNumber);
    const dbTickets = await JiraTicket.find({
      ticketNumber: { $in: ticketNumbers },
    }).lean();

    // Merge Jira + DB fields
    const merged = await Promise.all(
      jiraIssues.map(async (jiraTicket) => {
        let dbTicket = dbTickets.find(
          (t) => t.ticketNumber === jiraTicket.ticketNumber
        );

        // If not found in DB, create it
        if (!dbTicket) {
          dbTicket = await JiraTicket.create({
            ticketNumber: jiraTicket.ticketNumber,
            title: jiraTicket.title,
            description: jiraTicket.description,
            status: jiraTicket.status,
          });
        }

        return { ...jiraTicket, ...dbTicket };
      })
    );

    res.json(merged);
  } catch (err) {
    console.error("Jira API error:", err.response?.data || err.message);
    res.status(500).json({ message: "Error fetching Jira issues" });
  }
});

// 🔹 Update Jira ticket (custom fields only)
router.put("/update-ticket/:ticketNumber", verifyToken, async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    let ticket = await JiraTicket.findOne({ ticketNumber });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found in DB" });
    }

    const updaterId = req.user.userId;
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
    if (req.io) req.io.emit("ticketUpdated", ticket);

    res.json(ticket);
  } catch (err) {
    console.error("Error updating ticket:", err.response?.data || err.message);
    res.status(500).json({ message: "Error updating ticket" });
  }
});

module.exports = router;
