import { useEffect, useState } from "react";
import API from "../utils/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

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

  const fetchTasks = async () => {
    const res = await API.get("/tasks");
    setTasks(res.data);
  };

  const createTask = async () => {
    if (!title.trim()) return;
    await API.post("/tasks", { title, description });
    setTitle("");
    setDescription("");
    fetchTasks();
  };

  const updateTask = async (id, update) => {
    await API.put(`/tasks/${id}`, update);
    fetchTasks();
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await API.delete(`/tasks/${id}`);
    fetchTasks();
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const taskId = draggableId;
    const newStatus = destination.droppableId;

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
  }, []);

  return (
    <div>
      {/* Task creation */}
      <div className="flex gap-2 mb-4">
        <input
          className="input"
          placeholder="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="input"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="btn" onClick={createTask}>
          Add Task
        </button>
      </div>

      {/* Task counter */}
      <p className="mb-2 text-gray-700">
        Pending tasks: {tasks.filter((t) => t.status !== "done").length}
      </p>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(columns).map(([key, label]) => (
            <Droppable droppableId={key} key={key}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-100 p-3 rounded min-h-[300px]">
                  <h3 className="font-semibold text-lg mb-2">{label}</h3>
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
                            className="bg-white p-2 rounded shadow mb-2 cursor-grab"
                            style={{ ...provided.draggableProps.style }}>
                            <div className="font-medium">{task.title}</div>
                            {task.description && (
                              <div className="text-sm">{task.description}</div>
                            )}
                            {task.reasonForDelay && (
                              <div className="text-xs text-red-600 mt-1">
                                Reason: {task.reasonForDelay}
                              </div>
                            )}
                            {/* ✅ Add history display here */}
                            {task.history && task.history.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                <strong>History:</strong>
                                <ul className="list-disc ml-4">
                                  {task.history.map((h, i) => (
                                    <li key={i}>
                                      {columns[h.status]} by{" "}
                                      {h.changedBy?.name || "Unknown"} on{" "}
                                      {new Date(h.changedAt).toLocaleString()}
                                      {h.reason && ` — Reason: ${h.reason}`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {user.role === "lead" && (
                              <button
                                className="text-red-500 text-xs mt-1"
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
