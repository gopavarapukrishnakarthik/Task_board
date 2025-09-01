import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  // Handlers for navigation
  const handleEvent = () => navigate("/dashboard");
  const handleInfo = () => navigate("/admin");
  const handleData = () => navigate("/tickets");

  return (
    <div className="bg-amber-400 h-screen flex flex-col items-center justify-center text-center">
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
          Updates Dashboard
        </button>
        <button
          onClick={handleInfo}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Admin's Corner
        </button>
        <button
          onClick={handleData}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Tickets Status
        </button>
      </div>
    </div>
  );
};

export default HomePage;
