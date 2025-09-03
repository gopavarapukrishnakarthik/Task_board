import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api"; // axios instance

export default function MyTasks() {
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [createdTasks, setCreatedTasks] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")); // already saved in home

  // ✅ Fetch tasks and split into 2 sections
  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks");
      const allTasks = res.data;

      const myAssigned = allTasks.filter(
        (task) => task.assignedTo?._id === user._id
      );

      const myCreated = allTasks.filter(
        (task) => task.createdBy?._id === user._id
      );

      setAssignedTasks(myAssigned);
      setCreatedTasks(myCreated);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
    }
  };

  // ✅ Delete task (lead OR creator)
  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await API.delete(`/tasks/${id}`);
      fetchTasks(); // refresh
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  useEffect(() => {
    if (user?._id) fetchTasks();
  }, [user?._id]);

  return (
    <div className="p-6 h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-white">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold">
          Tasks assigned and created – {user?.name}
        </h1>
      </div>

      {/* Tasks Assigned to Me */}
      <div className="mb-8">
        <h3 className="font-semibold mb-2 text-blue-600">
          Tasks Assigned to Me
        </h3>
        {assignedTasks.length === 0 ? (
          <p className="text-gray-500">No tasks assigned to you.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {assignedTasks.map((task) => (
              <li
                key={task._id}
                className="border p-3 rounded shadow-sm flex justify-between 
             transition-transform transform hover:-translate-y-1 hover:shadow-lg hover:z-10">
                <div>
                  <h4 className="font-bold">{task.title}</h4>
                  <p>{task.description}</p>
                  <small>
                    Assigned by:{" "}
                    {task.createdBy ? task.createdBy.name : "Unknown"}
                  </small>
                </div>

                {(user?.role === "lead" ||
                  task.createdBy?._id === user._id) && (
                  <button
                    className="text-red-500 text-xs hover:underline"
                    onClick={() => deleteTask(task._id)}>
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tasks Created by Me */}
      <div>
        <h3 className="font-semibold mb-2 text-green-600">
          Tasks Created by Me
        </h3>
        {createdTasks.length === 0 ? (
          <p className="text-gray-500">You haven't created any tasks.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {createdTasks.map((task) => (
              <li
                key={task._id}
                className="border p-3 rounded shadow-sm flex justify-between 
             transition-transform transform hover:-translate-y-1 hover:shadow-lg hover:z-10">
                <div>
                  <h4 className="font-bold">{task.title}</h4>
                  <p>{task.description}</p>
                  <small>
                    Assigned to:{" "}
                    {task.assignedTo ? task.assignedTo.name : "Unassigned"}
                  </small>
                </div>

                {/* Creator can always delete their own tasks */}
                <button
                  className="text-red-500 text-xs hover:underline"
                  onClick={() => deleteTask(task._id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
