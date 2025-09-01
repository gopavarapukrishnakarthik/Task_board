import React, { useState, useEffect } from "react";
import API from "../utils/api"; // ✅ make sure your axios instance is imported

const AdminsCorner = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState(""); // ✅ manage selected user
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); // ✅ list of users for dropdown

  // fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks");
      setTasks(res.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  // fetch users
  const fetchUsers = async () => {
    try {
      const res = await API.get("/users"); // ✅ make sure backend has this route
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  // create task
  const createTask = async () => {
    if (!title.trim()) return;

    try {
      await API.post("/tasks", {
        title,
        description,
        assignedTo, // ✅ comes from dropdown
      });

      // reset form
      setTitle("");
      setDescription("");
      setAssignedTo("");

      fetchTasks();
    } catch (err) {
      console.error("Error creating task:", err);
      alert("Failed to create task. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Admin's Corner</h1>

      {/* Task Creation Form */}
      <div className="mb-6 space-y-2">
        <input
          type="text"
          placeholder="Task title"
          className="border p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Task description"
          className="border p-2 rounded w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="border p-2 rounded w-full"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">-- Assign to user --</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>

        <button
          onClick={createTask}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Create Task
        </button>
      </div>

      {/* Task List */}
      <div>
        <h2 className="text-xl mb-2">Tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks found</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task._id}
                className="border p-3 rounded flex justify-between">
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p>{task.description}</p>
                  <small>
                    Assigned to: {task.assignedTo?.name || "Unassigned"}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminsCorner;
