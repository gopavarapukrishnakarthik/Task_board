import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await API.post("/auth/register", form);
    navigate("/");
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Register</h2>
      <input
        className="input"
        type="text"
        placeholder="Name"
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <input
        className="input mt-2"
        type="email"
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />
      <input
        className="input mt-2"
        type="password"
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />
      <select
        className="input mt-2"
        required
        onChange={(e) => setForm({ ...form, role: e.target.value })}>
        <option value="member">Member</option>
        <option value="lead">Lead</option>
      </select>
      <button className="btn mt-4">Register</button>
    </form>
  );
}
