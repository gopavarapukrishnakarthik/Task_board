import TaskBoard from "../components/TaskBoard";
import HomePage from "./HomePage";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const handleLogout = async () => {
    try {
      // Call backend to clear the cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // ✅ important to send cookies
      });

      // Remove user data from localStorage
      localStorage.removeItem("user");

      // Redirect to login page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  const navigate = useNavigate();
  const handlehome = () => navigate("/home");

  return (
    <div className="p-4 flex flex-col h-screen bg-gradient-to-b from-gray-100 via-gray-50 to-white">
      <div className="m-5 flex items-center justify-between">
        <button
          onClick={handlehome} // go back one step in history
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
          Back
        </button>

        <h1 className="text-xl mb-2">
          Welcome, {user.name} ({user.role})
        </h1>
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
          Logout
        </button>
      </div>
      <TaskBoard user={user} />
    </div>
  );
}
