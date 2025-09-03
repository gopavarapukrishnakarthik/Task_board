import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api"; // axios instance
import { Trash2 } from "lucide-react";

export default function AdminsCorner() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  // ✅ Fetch all users for dropdown
  const fetchUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // ✅ Fetch only tasks created by me
  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks", { params: { createdBy: user._id } });
      setTasks(res.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  // ✅ Delete task
  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await API.delete(`/tasks/${id}`);
      fetchTasks(); // refresh after delete
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // ✅ Create new task
  const createTask = async () => {
    if (!title.trim()) return;
    try {
      await API.post("/tasks", {
        title,
        description,
        assignedTo,
        dueDate, // dropdown userId
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
  }, []);

  return (
    <div className="p-6 h-full bg-gradient-to-b from-lime-200 via-lime-100 to-white">
      {/* Header with user info */}
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
      <div className="mb-6 space-y-3 ">
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
          className="border p-2 w-sm mr-5 rounded">
          <option value="">-- Assign to --</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.name} ({user.role})
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border p-2  w-sm mr-10 rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          onClick={createTask}
          className="bg-blue-600 text-white w-32 h-10 px-4 py-2 rounded">
          Create Task
        </button>
      </div>

      {/* Task List */}
      <div>
        <h3 className="font-semibold mb-2">Tasks Created by Me</h3>
        <ul className="grid grid-cols-2 gap-4">
          {tasks.map((task) => (
            <li
              key={task._id}
              className=" p-3 rounded shadow-sm flex justify-between 
             transition-transform transform hover:-translate-y-1 hover:shadow-lg hover:z-10 bg-white">
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

              {/* Show delete only if user is lead */}
              {user?.role === "lead" && (
                <button
                  className="text-red-500 text-xs hover:underline"
                  onClick={() => deleteTask(task._id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
