import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Load user details from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/"); // redirect to login if no user
    }
  }, [navigate]);

  // Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Navigation handlers
  const handleEvent = () => navigate("/dashboard");
  const handleInfo = () => navigate("/admin");
  const handleData = () => navigate("/mytasks");

  return (
    <div className="h-screen bg-gradient-to-b from-orange-100 via-pink-50 to-white flex flex-col items-center justify-center text-center relative">
      {/* 🔹 User Header */}
      <div className="absolute top-4 right-6 flex items-center gap-4">
        {user && (
          <>
            <span className="text-black font-medium">
              {user.name} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
              Logout
            </button>
          </>
        )}
      </div>

      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold mb-4">
          Welcome team to the Internal Support Portal
        </h1>
        <p className="text-lg mb-8">
          Here you can view tasks, add new tasks, and review their status.
        </p>
      </div>

      {/* Buttons Section */}
      <div className="flex flex-col gap-4 w-64">
        <button
          onClick={handleEvent}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Task's Dashboard
        </button>

        {/* Only show if role = lead */}
        {user?.role === "lead" && (
          <button
            onClick={handleInfo}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            Lead's Board
          </button>
        )}

        <button
          onClick={handleData}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          My Tasks
        </button>
      </div>
    </div>
  );
};

export default HomePage;
