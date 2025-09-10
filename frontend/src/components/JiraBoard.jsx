import React, { useEffect, useState } from "react";
import API from "../utils/api";

export default function JiraBoard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [formData, setFormData] = useState({
    cpVersion: "",
    site: "",
    environment: "",
    filesReceived: "",
    affectedComponents: "",
    rca: "",
    notes: "",
    status: "",
    keyPoints: "",
  });

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

  const statuses = ["InProgress", "Waiting for customer", "Escalated"];
  const grouped = statuses.reduce((acc, status) => {
    acc[status] = issues.filter((i) => i.status === status);
    return acc;
  }, {});

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setFormData({
      cpVersion: ticket.cpVersion || "",
      site: ticket.site || "",
      environment: ticket.environment || "",
      filesReceived: ticket.filesReceived || "",
      affectedComponents: ticket.affectedComponents || "",
      rca: ticket.rca || "",
      notes: ticket.notes || "",
      status: ticket.status || "",
      keyPoints: ticket.keyPoints || "",
    });
    setHistory(ticket.history || []);
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setHistory([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await API.put(
        `/jira/update-ticket/${selectedTicket.ticketNumber}`,
        formData
      );
      setIssues((prev) =>
        prev.map((t) =>
          t.ticketNumber === selectedTicket.ticketNumber ? res.data : t
        )
      );
      closeModal();
    } catch (err) {
      console.error("Error updating ticket", err.response?.data || err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading BIOT tickets...</p>;

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
                    className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition cursor-pointer"
                    onClick={() => openTicket(ticket)}>
                    <p className="font-semibold text-blue-900">
                      {ticket.ticketNumber} — {ticket.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      Assigned: {ticket.assignedToName || "Unassigned"}
                    </p>
                    {ticket.dueDate && (
                      <p className="text-sm text-red-600">
                        Due: {new Date(ticket.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 md:w-3/4 lg:w-2/3 p-6 max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
              onClick={closeModal}>
              ✖
            </button>

            <h3 className="text-xl font-bold mb-4">
              {selectedTicket.ticketNumber} — {selectedTicket.title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "CP Version", name: "cpVersion" },
                { label: "Site", name: "site" },
                { label: "Prod/Test", name: "environment" },
                { label: "Files received", name: "filesReceived" },
                { label: "Affected components", name: "affectedComponents" },
                { label: "RCA", name: "rca" },
                { label: "Key Points", name: "keyPoints" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-gray-700">{field.label}</label>
                  <input
                    type="text"
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-gray-700">
                Notes / More details
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="mt-1 w-full border rounded px-2 py-1 h-24"
              />
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">
                Cancel
              </button>
              <button
                onClick={saveTicket}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                Save
              </button>
            </div>

            {history.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">History</h4>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {history.map((h, idx) => (
                    <li key={idx} className="text-sm text-gray-600">
                      {h.changedByName || "Unknown"} changed {h.field} to "
                      {h.value}" on {new Date(h.changedAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
