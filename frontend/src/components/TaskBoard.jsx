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

export default function TaskBoard({ user }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [dueFilter, setDueFilter] = useState("");

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
      await API.post("/tasks", { title, description, dueDate });
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

    // Optimistically update local state
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
    <div className="p-4">
      {/* Task creation */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="border p-2 rounded w-40"
          placeholder="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 rounded w-48"
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

      {/* Simple Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="border p-2 rounded w-48"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value)}>
          <option value="">All Due Dates</option>
          <option value="today">Due Today</option>
          <option value="overdue">Overdue</option>
        </select>
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
                    .map((task, index) => (
                      <Draggable
                        draggableId={String(task._id)}
                        index={index}
                        key={task._id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white p-3 rounded-lg shadow mb-2 cursor-grab hover:shadow-md">
                            <div className="font-medium">{task.title}</div>
                            {task.description && (
                              <div className="text-sm">{task.description}</div>
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
                            {user.role === "lead" && (
                              <button
                                className="text-red-500 text-xs mt-2 hover:underline"
                                onClick={() => deleteTask(task._id)}>
                                Delete
                              </button>
                            )}
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
    </div>
  );
}
