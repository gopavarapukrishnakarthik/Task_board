import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import img2 from "../assets/img2.jpg";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/login", form);

      // Store token + user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/home");
    } catch (err) {
      // 🔹 If account is not approved, backend sends 403 with custom message
      const msg = err.response?.data?.message || "Login failed";
      alert(msg);
    }
  };
  return (
    <div
      className="h-screen flex justify-center items-center bg-cover bg-center"
      style={{ backgroundImage: `url(${img2})` }}>
      <div className="border border-amber-50 backdrop-blur-sm w-fit h-fit">
        <form onSubmit={handleSubmit} className="p-6 max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Login</h2>
          <input
            className="input"
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
          <div className="flex flex-col">
            <button className="btn mt-4">Login</button>
            <p className="pt-5">
              Don’t have an account?{" "}
              <a
                className="text-blue-600 hover:underline hover:text-blue-800"
                href="/register">
                Click here to register
              </a>{" "}
              with proper role and then log in.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
