import { useEffect, useState } from "react";
import API from "../utils/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import io from "socket.io-client";

const socket = io("http://192.168.0.118:5000"); // adjust when deploying

const columns = {
  todo: "To Do",
  inprogress: "In Progress",
  blocked: "Blocked",
  done: "Completed",
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [dueFilter, setDueFilter] = useState("");

  // ✅ Get logged-in user from localStorage
  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks", {
        params: { search, due: dueFilter },
      });
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  // Create task
  const createTask = async () => {
    if (!title.trim()) return;
    try {
      await API.post("/tasks", {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  // Update task
  const updateTask = async (id, update) => {
    try {
      await API.put(`/tasks/${id}`, update);
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  // Delete task (Lead only)
  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await API.delete(`/tasks/${id}`);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // Drag & Drop handler
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const taskId = draggableId;
    const newStatus = destination.droppableId;

    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );

    if (newStatus === "blocked") {
      const reason = prompt("Enter reason for blocking this task:");
      if (!reason) return;
      await updateTask(taskId, { status: newStatus, reasonForDelay: reason });
    } else {
      await updateTask(taskId, { status: newStatus, reasonForDelay: "" });
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, dueFilter]);

  // Socket real-time sync
  useEffect(() => {
    socket.on("taskCreated", fetchTasks);
    socket.on("taskUpdated", fetchTasks);
    socket.on("taskDeleted", fetchTasks);
    return () => {
      socket.off("taskCreated");
      socket.off("taskUpdated");
      socket.off("taskDeleted");
    };
  }, []);

  return (
    <div className="p-4 flex flex-col h-screen bg-gradient-to-b from-gray-100 via-gray-50 to-white">
      {/* ✅ Page Header */}
      <div className="m-5 text-center">
        <h1 className="text-xl font-semibold ">
          Welcome, {user?.name} ({user?.role})
        </h1>
      </div>

      {/* Task creation */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <input
          className="border p-2 rounded w-96"
          placeholder="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 rounded w-96"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="date"
          className="border p-2 rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-3 py-2 rounded"
          onClick={createTask}>
          Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        <input
          className="border p-2 rounded w-dvh"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border p-2 rounded w-48"
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value)}>
          <option value="">All Due Dates</option>
          <option value="today">Due Today</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm mb-3">
        <span className="px-2 py-1 rounded bg-red-200">Overdue</span>
        <span className="px-2 py-1 rounded bg-yellow-200">Due Today</span>
        <span className="px-2 py-1 rounded bg-orange-200">Due Tomorrow</span>
      </div>

      {/* Task counter */}
      <p className="mb-3 text-gray-700 font-medium">
        Total Pending: {tasks.filter((t) => t.status !== "done").length}
      </p>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(columns).map(([key, label]) => (
            <Droppable droppableId={key} key={key}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-100 p-3 rounded-lg min-h-[350px] shadow">
                  <h3 className="font-semibold text-lg mb-2 flex justify-between">
                    {label}
                    <span className="text-sm text-gray-500">
                      {tasks.filter((t) => t.status === key).length}
                    </span>
                  </h3>
                  {tasks
                    .filter((t) => t.status === key)
                    .map((task, index) => {
                      // Default card style
                      let cardClasses =
                        "p-3 rounded-lg shadow mb-2 cursor-grab hover:shadow-md";

                      // Apply due date color coding
                      if (task.dueDate) {
                        const today = new Date();
                        const due = new Date(task.dueDate);
                        today.setHours(0, 0, 0, 0);
                        due.setHours(0, 0, 0, 0);

                        const diffDays = Math.floor(
                          (due - today) / (1000 * 60 * 60 * 24)
                        );

                        if (diffDays === 1) {
                          cardClasses += " bg-orange-200";
                        } else if (diffDays === 0) {
                          cardClasses += " bg-yellow-200";
                        } else if (diffDays < 0) {
                          cardClasses += " bg-red-200";
                        } else {
                          cardClasses += " bg-white";
                        }
                      } else {
                        cardClasses += " bg-white";
                      }

                      return (
                        <Draggable
                          draggableId={String(task._id)}
                          index={index}
                          key={task._id}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cardClasses}>
                              <div className="font-medium">{task.title}</div>
                              {task.description && (
                                <div className="text-sm">
                                  {task.description}
                                </div>
                              )}
                              {task.dueDate && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Due:{" "}
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                              {task.reasonForDelay && (
                                <div className="text-xs text-red-600 mt-1">
                                  Reason: {task.reasonForDelay}
                                </div>
                              )}
                              {user?.role === "lead" && (
                                <button
                                  className="text-red-500 text-xs mt-2 hover:underline"
                                  onClick={() => deleteTask(task._id)}>
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
