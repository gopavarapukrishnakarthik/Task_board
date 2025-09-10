const express = require("express");
const axios = require("axios");
const { verifyToken } = require("../middleware/authMiddleware");

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

// ✅ Get BIOT tickets in selected statuses (case-insensitive, includes unassigned)
router.get("/board-issues", verifyToken, async (req, res) => {
  try {
    const jql = `project = BIOT ORDER BY created DESC`;

    const response = await axios.get(
      `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(
        jql
      )}&maxResults=500`,
      { headers: authHeader }
    );

    const allIssues = response.data.issues.map((issue) => ({
      _id: issue.id,
      ticketNumber: issue.key,
      title: issue.fields.summary,
      description:
        issue.fields.description?.plainText ||
        issue.fields.description?.content?.[0]?.content?.[0]?.text ||
        "",
      status: issue.fields.status?.name || "Unknown",
      assignedTo: {
        name: issue.fields.assignee?.displayName || "Unassigned",
        email: issue.fields.assignee?.emailAddress || null,
      },
      dueDate: issue.fields.duedate || null,
    }));

    // ✅ Only keep specific statuses (case-insensitive)
    const VALID_STATUSES = ["InProgress", "Waiting for customer", "Escalated"];
    const filteredIssues = allIssues.filter((issue) =>
      VALID_STATUSES.some((s) => s.toLowerCase() === issue.status.toLowerCase())
    );

    res.json(filteredIssues);
  } catch (err) {
    console.error("Jira API error:", err.response?.data || err.message);
    res.status(500).json({ message: "Error fetching Jira issues" });
  }
});

module.exports = router;
