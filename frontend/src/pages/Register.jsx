import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import img8 from "../assets/img8.jpg";

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
    alert("Registration successful! Your account is pending lead approval.");
    navigate("/");
  };

  return (
    <div
      className="h-screen flex justify-center items-center bg-cover bg-center"
      style={{ backgroundImage: `url(${img8})` }}>
      <div className="border border-amber-50 backdrop-blur-sm w-fit h-fit rounded-2xl">
        <form
          onSubmit={handleSubmit}
          className="p-6 max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold mb-4 items-center">Register</h2>
          <input
            className="input border border-gray-500"
            type="text"
            placeholder="Name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input mt-2 border-gray-500"
            type="email"
            placeholder="Email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="input mt-2 border-gray-500"
            type="password"
            placeholder="Password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="input mt-2 border-gray-500"
            required
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="member">Member</option>
            <option value="lead">Lead</option>
          </select>
          <button className="btn mt-4">Register</button>
          <p className="mt-4 text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/" className="text-blue-600 hover:underline">
              Click here to log in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
