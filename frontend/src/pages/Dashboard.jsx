import TaskBoard from "../components/TaskBoard";

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

  return (
    <div className="p-4">
      <h1 className="text-xl mb-2">
        Welcome, {user.name} ({user.role})
      </h1>
      <button
        onClick={handleLogout}
        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
        Logout
      </button>
      <TaskBoard user={user} />
    </div>
  );
}
