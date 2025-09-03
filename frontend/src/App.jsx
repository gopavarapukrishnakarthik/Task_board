import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import AdminsCorner from "./pages/AdminsCorner";
import MyTasks from "./pages/MyTasks";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/admin" element={<AdminsCorner />} />
        <Route path="/mytasks" element={<MyTasks />} />
      </Routes>
    </Router>
  );
}

export default App;
