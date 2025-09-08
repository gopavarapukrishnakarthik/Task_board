import React, { useState, useEffect } from "react";
import API from "../utils/api";
import io from "socket.io-client";
import { Trash2, RotateCcw, Check, Edit } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const socket = io("http://192.168.0.118:5000"); // adjust backend URL

export default function TicketBoard() {
  const [tickets, setTickets] = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(null);
  const [showClosed, setShowClosed] = useState(false);
  const [reason, setReason] = useState("");

  const statusColumns = ["support", "waiting", "engineering"];

  // Fetch active tickets
  const fetchTickets = async () => {
    const res = await API.get("/tickets");
    setTickets(res.data);
  };

  // Fetch closed tickets
  const fetchClosedTickets = async () => {
    const res = await API.get("/tickets/closed");
    setClosedTickets(res.data);
  };

  // Fetch users
  const fetchUsers = async () => {
    const res = await API.get("/auth/users");
    setUsers(res.data);
  };

  // Create ticket
  const createTicket = async (data) => {
    await API.post("/tickets", data);
    setShowModal(null);
  };

  // Update ticket
  const updateTicket = async (ticket) => {
    if (!reason) return alert("Reason is required!");
    await API.put(`/tickets/${ticket._id}`, {
      ...ticket,
      reason,
    });
    setShowModal(null);
    setReason("");
  };

  // Close ticket
  const closeTicket = async (ticket) => {
    const reasonText = prompt("Enter reason for closing ticket:");
    if (!reasonText) return;
    await API.put(`/tickets/${ticket._id}/close`, { reason: reasonText });
  };

  // Reopen ticket
  const reopenTicket = async (ticket) => {
    await API.put(`/tickets/${ticket._id}/reopen`);
  };

  // Drag and drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const ticket = tickets.find((t) => t._id === draggableId);
    if (!ticket) return;

    const newStatus = destination.droppableId;
    if (ticket.status !== newStatus) {
      const reasonText = prompt("Reason for changing status:");
      if (!reasonText) return;

      await API.put(`/tickets/${ticket._id}`, {
        status: newStatus,
        reason: reasonText,
      });
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchClosedTickets();
    fetchUsers();

    // Socket listeners
    socket.on("ticketCreated", (t) => setTickets((prev) => [t, ...prev]));
    socket.on("ticketUpdated", (t) =>
      setTickets((prev) => prev.map((x) => (x._id === t._id ? t : x)))
    );
    socket.on("ticketClosed", (t) => {
      setTickets((prev) => prev.filter((x) => x._id !== t._id));
      setClosedTickets((prev) => [t, ...prev]);
    });
    socket.on("ticketReopened", (t) => {
      setClosedTickets((prev) => prev.filter((x) => x._id !== t._id));
      setTickets((prev) => [t, ...prev]);
    });

    return () => socket.off();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Ticket Board</h1>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => setShowModal({})}>
            New Ticket
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setShowClosed(!showClosed)}>
            {showClosed ? "Active Tickets" : "Closed Tickets"}
          </button>
        </div>
      </div>

      {!showClosed && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-3 gap-4">
            {statusColumns.map((status) => (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-white p-3 rounded shadow min-h-[400px]">
                    <h2 className="font-semibold mb-2 capitalize">{status}</h2>
                    {tickets
                      .filter((t) => t.status === status)
                      .map((ticket, index) => (
                        <Draggable
                          key={ticket._id}
                          draggableId={ticket._id}
                          index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-gray-100 p-3 mb-2 rounded cursor-pointer"
                              onClick={() => setShowModal(ticket)}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold">
                                    {ticket.ticketNumber} - {ticket.title}
                                  </p>
                                  <small>
                                    Assigned:{" "}
                                    {ticket.assignedTo?.name || "Unassigned"}
                                  </small>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeTicket(ticket);
                                    }}>
                                    <Trash2 />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {showClosed && (
        <div className="grid grid-cols-3 gap-4">
          {closedTickets.map((ticket) => (
            <div key={ticket._id} className="bg-red-50 p-3 rounded shadow">
              <p className="font-bold">
                {ticket.ticketNumber} - {ticket.title}
              </p>
              <small>Assigned: {ticket.assignedTo?.name || "Unassigned"}</small>
              <small>
                Closed by:{" "}
                {ticket.history?.length
                  ? ticket.history[ticket.history.length - 1].changedBy?.name
                  : "Unknown"}
              </small>
              <div className="flex gap-2 mt-2">
                <button
                  className="text-green-600"
                  onClick={() => reopenTicket(ticket)}>
                  <RotateCcw />
                </button>
                <button
                  className="text-gray-600"
                  onClick={() => setShowModal(ticket)}>
                  <Edit />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start pt-10 z-50">
          <div className="bg-white w-2/3 p-6 rounded-lg flex flex-col relative">
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={() => setShowModal(null)}>
              X
            </button>
            <h2 className="text-xl font-bold mb-2">Ticket Overview</h2>

            <input
              placeholder="Ticket Number"
              className="border p-2 mb-2 w-full rounded"
              value={showModal.ticketNumber || ""}
              onChange={(e) =>
                setShowModal({ ...showModal, ticketNumber: e.target.value })
              }
            />
            <input
              placeholder="Title"
              className="border p-2 mb-2 w-full rounded"
              value={showModal.title || ""}
              onChange={(e) =>
                setShowModal({ ...showModal, title: e.target.value })
              }
            />
            <textarea
              placeholder="Description"
              className="border p-2 mb-2 w-full rounded"
              value={showModal.description || ""}
              onChange={(e) =>
                setShowModal({ ...showModal, description: e.target.value })
              }
            />
            <select
              className="border p-2 mb-2 rounded w-64"
              value={showModal.assignedTo?._id || ""}
              onChange={(e) =>
                setShowModal({
                  ...showModal,
                  assignedTo: users.find((u) => u._id === e.target.value),
                })
              }>
              <option value="">-- Assign to --</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Reason for change"
              className="border p-2 mb-2 w-full rounded"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded mt-2 w-32"
              onClick={() => {
                if (!showModal._id) createTicket(showModal);
                else updateTicket(showModal);
              }}>
              {showModal._id ? "Save" : "Create"}
            </button>

            {showModal.history?.length > 0 && (
              <div className="mt-4 border p-3 rounded h-64 overflow-auto bg-gray-50">
                <h3 className="font-semibold mb-2">History</h3>
                {showModal.history.map((h, idx) => (
                  <div key={idx} className="border-b mb-1 pb-1">
                    <p>Status: {h.status}</p>
                    <p>Assigned to: {h.assignedTo?.name || "Unassigned"}</p>
                    <p>By: {h.changedBy?.name || "Unknown"}</p>
                    <p>Reason: {h.reason}</p>
                    <small>{new Date(h.changedAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
