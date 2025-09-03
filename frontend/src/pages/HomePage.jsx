import { useEffect, useState } from "react";
import API from "../utils/api"; // axios instance
import AdminsCorner from "./AdminsCorner";
import MyTasks from "./MyTasks";
import TaskBoard from "../components/TaskBoard";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("home");

  // Load user details from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      window.location.href = "/"; // redirect to login if no user
    }
  }, []);

  // Logout
  const handleLogout = async () => {
    try {
      await API.post("/auth/logout", {}, { withCredentials: true });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col p-4">
        <h2 className="text-xl font-bold mb-6">
          {user?.name} ({user?.role})
        </h2>

        <nav className="space-y-3">
          <button
            className={`w-full text-left px-3 py-2 rounded ${
              activePage === "home" ? "bg-gray-700" : ""
            }`}
            onClick={() => setActivePage("home")}>
            🏠 Home
          </button>

          {user?.role === "lead" && (
            <button
              className={`w-full text-left px-3 py-2 rounded ${
                activePage === "admin" ? "bg-gray-700" : ""
              }`}
              onClick={() => setActivePage("admin")}>
              ⚙️ Lead Control Panel
            </button>
          )}

          <button
            className={`w-full text-left px-3 py-2 rounded ${
              activePage === "tasks" ? "bg-gray-700" : ""
            }`}
            onClick={() => setActivePage("tasks")}>
            ✅ My Tasks
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded">
            🚪 Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activePage === "home" && <TaskBoard />}
        {activePage === "admin" && <AdminsCorner />}
        {activePage === "tasks" && <MyTasks />}
      </div>
    </div>
  );
}
