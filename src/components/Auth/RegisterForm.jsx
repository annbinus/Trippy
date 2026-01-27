import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import navigator
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/themes.css";

export default function RegisterForm() {
  const navigate = useNavigate(); // ✅ initialize
  const [data, setData] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const { register } = useAuth();

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const [success, setSuccess] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    const err = {};

    if (!data.name) err.name = "Name is required";
    if (!data.email) err.email = "Email is required";
    else if (!validateEmail(data.email)) err.email = "Invalid email";
    if (!data.password) err.password = "Password is required";
    else if (data.password.length < 6)
      err.password = "Minimum 6 characters";

    setErrors(err);
    setSuccess("");

    if (Object.keys(err).length === 0) {
      register(data.name, data.email, data.password)
        .then(() => {
          setSuccess("Registration successful! Redirecting to login...");
          setTimeout(() => navigate('/login'), 1500);
        })
        .catch((errResp) => {
          if (errResp && (errResp.error || "").toLowerCase().includes("already")) {
            setErrors({ form: "User already registered" });
          } else {
            setErrors({ form: errResp.error || 'Registration failed' });
          }
        });
    }
  };

  return (
    <div className="form-container form-visible">
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Full Name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
        {errors.name && <span>{errors.name}</span>}

        <input
          type="email"
          placeholder="Email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
        />
        {errors.email && <span>{errors.email}</span>}

        <input
          type="password"
          placeholder="Password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
        />
        {errors.password && <span>{errors.password}</span>}
        {errors.form && <span style={{ color: '#ef4444' }}>{errors.form}</span>}
  {success && <span style={{ color: 'var(--brown-primary)', fontWeight: 600 }}>{success}</span>}

        <button>CREATE ACCOUNT</button>

        <p>
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="cursor-pointer underline"
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
