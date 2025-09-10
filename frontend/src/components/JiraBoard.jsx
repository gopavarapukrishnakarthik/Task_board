import React, { useEffect, useState } from "react";
import API from "../utils/api";

export default function JiraBoard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBoardIssues() {
      try {
        const res = await API.get("/jira/board-issues");
        setIssues(res.data);
      } catch (err) {
        console.error("Error fetching Jira board issues", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBoardIssues();
  }, []);

  if (loading) return <p className="text-gray-500">Loading BIOT tickets...</p>;

  // ✅ Normalize statuses for grouping
  const statuses = ["InProgress", "Waiting for customer", "Escalated"];
  const grouped = statuses.reduce((acc, status) => {
    acc[status] = issues.filter(
      (i) => i.status.toLowerCase() === status.toLowerCase()
    );
    return acc;
  }, {});

  return (
    <div className="bg-white shadow-lg rounded-2xl p-4 mt-6">
      <h2 className="text-xl font-bold mb-6">🟦 BIOT Jira Board</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statuses.map((status) => (
          <div key={status} className="bg-gray-50 p-3 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-3">{status}</h3>
            {grouped[status].length === 0 ? (
              <p className="text-gray-500 text-sm">No tickets</p>
            ) : (
              <ul className="space-y-2">
                {grouped[status].map((ticket) => (
                  <li
                    key={ticket._id}
                    className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition">
                    <p className="font-semibold text-blue-900">
                      {ticket.ticketNumber} — {ticket.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      Assigned: {ticket.assignedTo?.name || "Unassigned"}
                    </p>
                    {ticket.dueDate && (
                      <p className="text-sm text-red-600">
                        Due: {new Date(ticket.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    <a
                      href={`https://buildbot-team-p28lyda7.atlassian.net/browse/${ticket.ticketNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-blue-600 underline text-sm">
                      View in Jira →
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
