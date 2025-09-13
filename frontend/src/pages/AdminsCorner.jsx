import React, { useEffect, useState } from "react";
import API from "../utils/api";
import io from "socket.io-client";
import { Trash2, RotateCcw, Check, X } from "lucide-react";

const socket = io("http://localhost:5000"); // adjust backend host

export default function AdminsCorner() {
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [modalTask, setModalTask] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create Task fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch active tasks
  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks", { params: { createdBy: user._id } });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch deleted tasks
  const fetchDeletedTasks = async () => {
    if (user.role !== "lead") return;
    try {
      const res = await API.get("/tasks/deleted/all");
      setDeletedTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch pending users
  const fetchPendingUsers = async () => {
    if (user.role !== "lead") return;
    try {
      const res = await API.get("/auth/pending-users");
      setPendingUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Approve / Reject Users
  const approveUser = async (id) => {
    await API.put(`/auth/approve/${id}`);
    fetchPendingUsers();
  };
  const rejectUser = async (id) => {
    await API.put(`/auth/reject/${id}`);
    fetchPendingUsers();
  };

  // Create task
  const createTask = async () => {
    if (!title.trim()) return;
    try {
      await API.post("/tasks", { title, description, assignedTo, dueDate });
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Update task
  const updateTask = async (id, updates) => {
    try {
      // Send only assignedTo ID
      const payload = {
        ...updates,
        assignedTo: updates.assignedTo?._id || null,
      };
      await API.put(`/tasks/${id}`, payload);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete task
  const deleteTask = async (task) => {
    if (!window.confirm("Move this task to trash?")) return;
    try {
      await API.delete(`/tasks/${task._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Restore task
  const restoreTask = async (task) => {
    try {
      // Send old assignedTo to backend
      await API.put(`/tasks/${task._id}/restore`, {
        assignedTo: task.assignedTo?._id || null,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Socket.IO real-time updates
  useEffect(() => {
    socket.on("taskCreated", (task) => setTasks((prev) => [task, ...prev]));
    socket.on("taskUpdated", (task) =>
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)))
    );
    socket.on("taskDeleted", (task) => {
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      setDeletedTasks((prev) => [task, ...prev]);
    });
    socket.on("taskRestored", (task) => {
      setDeletedTasks((prev) => prev.filter((t) => t._id !== task._id));
      setTasks((prev) => [task, ...prev]);
    });

    return () => {
      socket.off("taskCreated");
      socket.off("taskUpdated");
      socket.off("taskDeleted");
      socket.off("taskRestored");
    };
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTasks();
    fetchDeletedTasks();
    fetchPendingUsers();
  }, []);

  return (
    <div className="p-6 bg-gradient-to-b from-lime-200 via-lime-100 to-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{user.name}'s Management Console</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => setShowCreate(true)}>
          Create Task
        </button>
      </div>

      {/* Active Tasks */}
      <div>
        <h2 className="font-semibold mb-2">Manage Tasks</h2>
        <ul className="grid grid-cols-2 gap-4">
          {tasks.map((task) => (
            <li
              key={task._id}
              className="bg-white p-3 rounded shadow hover:shadow-lg cursor-pointer"
              onClick={() => {
                setModalTask(task);
                setShowHistory(false);
              }}>
              <h3 className="font-bold">{task.title}</h3>
              <p className="text-sm">{task.description}</p>
              <small>
                Assigned to:{" "}
                {task.assignedTo ? task.assignedTo.name : "Unassigned"}
              </small>
              {task.dueDate && (
                <div className="text-xs text-blue-600 mt-1">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              {task.reasonForDelay && (
                <div className="text-xs text-red-600 mt-1">
                  Reason: {task.reasonForDelay}
                </div>
              )}
              {user.role === "lead" && (
                <button
                  className="text-red-500 hover:text-red-700 mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task);
                  }}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Deleted Tasks */}
      {user.role === "lead" && deletedTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-2">Deleted Tasks</h2>
          <ul className="grid grid-cols-2 gap-4">
            {deletedTasks.map((task) => (
              <li
                key={task._id}
                className="bg-red-50 border border-red-200 p-3 rounded flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{task.title}</h3>
                  <small className="text-red-600">
                    Deleted by: {task.deletedBy?.name || "Unknown"}
                  </small>
                </div>
                <button
                  className="text-green-600 hover:text-green-800"
                  onClick={() => restoreTask(task)}>
                  <RotateCcw />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending Users */}
      {user.role === "lead" && pendingUsers.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-2">Pending User Approvals</h2>
          <ul className="grid grid-cols-2 gap-4">
            {pendingUsers.map((u) => (
              <li
                key={u._id}
                className="bg-yellow-50 border border-yellow-200 p-3 rounded flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{u.name}</h3>
                  <p className="text-sm">{u.email}</p>
                  <small>Role: {u.role}</small>
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-green-600 hover:text-green-800"
                    onClick={() => approveUser(u._id)}>
                    <Check />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => rejectUser(u._id)}>
                    <X />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Task Modal */}
      {modalTask && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start pt-10 z-50">
          <div className="bg-white w-2/3 h-[80vh] rounded-lg p-6 flex flex-col relative overflow-y-auto">
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={() => setModalTask(null)}>
              X
            </button>
            <h2 className="text-xl font-bold mb-2">Task Details</h2>

            <input
              className="border p-2 mb-2 w-full rounded"
              value={modalTask.title}
              onChange={(e) =>
                setModalTask({ ...modalTask, title: e.target.value })
              }
            />
            <textarea
              className="border p-2 mb-2 w-full rounded"
              value={modalTask.description}
              onChange={(e) =>
                setModalTask({ ...modalTask, description: e.target.value })
              }
            />
            <select
              className="border p-2 mb-2 rounded w-64"
              value={modalTask.assignedTo?._id || ""}
              onChange={(e) =>
                setModalTask({
                  ...modalTask,
                  assignedTo: users.find((u) => u._id === e.target.value),
                })
              }>
              <option value="">-- Assign to --</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border p-2 mb-2 rounded w-64"
              value={modalTask.dueDate ? modalTask.dueDate.split("T")[0] : ""}
              onChange={(e) =>
                setModalTask({ ...modalTask, dueDate: e.target.value })
              }
            />

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded mt-2 w-32"
              onClick={() => {
                updateTask(modalTask._id, modalTask);
                setModalTask(null);
              }}>
              Save
            </button>

            <button
              className="text-gray-500 underline mt-2"
              onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? "Hide History" : "Show History"}
            </button>

            {showHistory && (
              <div className="mt-4 overflow-auto border p-3 rounded h-64 bg-gray-50">
                <h3 className="font-semibold mb-2">History</h3>
                {modalTask.history.map((h, idx) => (
                  <div key={idx} className="border-b mb-1 pb-1">
                    {h.status === "deleted" && (
                      <p className="text-red-600">
                        Task Deleted by: {h.changedBy?.name || "Unknown"}
                      </p>
                    )}
                    {h.status === "restored" && (
                      <p className="text-green-600">
                        Task Restored by: {h.changedBy?.name || "Unknown"}
                      </p>
                    )}
                    {h.status !== "deleted" && h.status !== "restored" && (
                      <>
                        {h.status && <p>Status changed to: {h.status}</p>}
                        {h.assignedTo && (
                          <p>
                            Assigned to:{" "}
                            {users.find((u) => u._id === h.assignedTo)?.name ||
                              "Unknown"}
                          </p>
                        )}
                        {h.reason && <p>Reason: {h.reason}</p>}
                      </>
                    )}
                    <small className="text-gray-500">
                      At: {new Date(h.changedAt).toLocaleString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start pt-10 z-50">
          <div className="bg-white w-2/3 rounded-lg p-6 flex flex-col relative">
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={() => setShowCreate(false)}>
              X
            </button>
            <h2 className="text-xl font-bold mb-2">Create Task</h2>

            <input
              className="border p-2 mb-2 w-full rounded"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="border p-2 mb-2 w-full rounded"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="border p-2 mb-2 rounded w-64"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">-- Assign to --</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border p-2 mb-2 rounded w-64"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded mt-2 w-32"
              onClick={createTask}>
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
