import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { Trash2, RotateCcw, Check, X } from "lucide-react";

export default function AdminsCorner() {
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch all users for task assignment dropdown
  const fetchUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch only tasks created by me
  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks", { params: { createdBy: user._id } });
      setTasks(res.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  // Fetch deleted tasks (leads only)
  const fetchDeletedTasks = async () => {
    if (user?.role !== "lead") return;
    try {
      const res = await API.get("/tasks/deleted/all");
      setDeletedTasks(res.data);
    } catch (error) {
      console.error("Error fetching deleted tasks:", error);
    }
  };

  // Fetch pending users (leads only)
  const fetchPendingUsers = async () => {
    if (user?.role !== "lead") return;
    try {
      const res = await API.get("/auth/pending-users");
      setPendingUsers(res.data);
    } catch (err) {
      console.error("Error fetching pending users:", err);
    }
  };

  // Approve user
  const approveUser = async (id) => {
    try {
      await API.put(`/auth/approve/${id}`);
      fetchPendingUsers();
    } catch (err) {
      console.error("Failed to approve user", err);
    }
  };

  // Reject user
  const rejectUser = async (id) => {
    try {
      await API.put(`/auth/reject/${id}`);
      fetchPendingUsers();
    } catch (err) {
      console.error("Failed to reject user", err);
    }
  };

  // Soft delete task
  const deleteTask = async (id) => {
    if (!window.confirm("Move this task to trash?")) return;
    try {
      await API.delete(`/tasks/${id}`);
      fetchTasks();
      fetchDeletedTasks();
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // Restore task
  const restoreTask = async (id) => {
    try {
      await API.put(`/tasks/${id}/restore`);
      fetchTasks();
      fetchDeletedTasks();
    } catch (err) {
      console.error("Failed to restore task", err);
    }
  };

  // Create new task
  const createTask = async () => {
    if (!title.trim()) return;
    try {
      await API.post("/tasks", {
        title,
        description,
        assignedTo,
        dueDate,
      });

      setTitle("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleHome = () => navigate("/home");

  useEffect(() => {
    fetchUsers();
    fetchTasks();
    fetchDeletedTasks();
    fetchPendingUsers();
  }, []);

  return (
    <div className="p-6 h-full bg-gradient-to-b from-lime-200 via-lime-100 to-white">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleHome}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
          Back
        </button>
        <h1 className="text-lg font-bold">
          Welcome, {user?.name} ({user?.role})
        </h1>
      </div>

      {/* Task Form */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 w-full rounded"
        />
        <textarea
          placeholder="Task description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 w-full rounded"
        />
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="border p-2 rounded w-64 mr-8">
          <option value="">-- Assign to --</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border p-2 rounded w-64 mr-8"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          onClick={createTask}
          className="bg-blue-600 text-white w-32 h-10 px-4 py-2 rounded">
          Create Task
        </button>
      </div>

      {/* Active Tasks */}
      <div>
        <h3 className="font-semibold mb-2">Tasks Created by Me</h3>
        <ul className="grid grid-cols-2 gap-4">
          {tasks.map((task) => (
            <li
              key={task._id}
              className="p-3 rounded shadow-sm flex justify-between bg-white hover:-translate-y-1 hover:shadow-lg transition">
              <div>
                <h4 className="font-bold">{task.title}</h4>
                <p>{task.description}</p>
                <small>
                  Assigned to:{" "}
                  {task.assignedTo ? task.assignedTo.name : "Unassigned"}
                </small>
                <div className="text-xs text-blue-600 mt-1">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </div>
              </div>

              {user?.role === "lead" && (
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => deleteTask(task._id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Deleted Tasks (Lead only) */}
      {user?.role === "lead" && (
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Deleted Tasks</h3>
          {deletedTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No deleted tasks</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4">
              {deletedTasks.map((task) => (
                <li
                  key={task._id}
                  className="p-3 rounded shadow-sm flex justify-between bg-red-50 border border-red-200">
                  <div>
                    <h4 className="font-bold">{task.title}</h4>
                    <p>{task.description}</p>
                    <small className="text-red-600">
                      Deleted by: {task.deletedBy?.name} on{" "}
                      {new Date(task.deletedAt).toLocaleDateString()}
                    </small>
                  </div>

                  <button
                    className="text-green-600 hover:text-green-800"
                    onClick={() => restoreTask(task._id)}>
                    <RotateCcw size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Pending User Approvals (Lead only) */}
      {user?.role === "lead" && (
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Pending User Approvals</h3>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No pending users</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4">
              {pendingUsers.map((u) => (
                <li
                  key={u._id}
                  className="p-3 rounded shadow-sm flex justify-between bg-yellow-50 border border-yellow-200">
                  <div>
                    <h4 className="font-bold">{u.name}</h4>
                    <p>{u.email}</p>
                    <small className="text-gray-600">Role: {u.role}</small>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-green-600 hover:text-green-800"
                      onClick={() => approveUser(u._id)}>
                      <Check size={18} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => rejectUser(u._id)}>
                      <X size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
