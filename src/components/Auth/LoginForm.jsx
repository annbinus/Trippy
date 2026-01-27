import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/themes.css";

export default function LoginForm() {
  const navigate = useNavigate();
  const [data, setData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = {};
    if (!data.email) err.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      err.email = "Invalid email";
    if (!data.password) err.password = "Password is required";
    else if (data.password.length < 6) err.password = "Minimum 6 characters";

    setErrors(err);

    if (Object.keys(err).length === 0) {
      login(data.email, data.password)
        .then(() => navigate('/home'))
        .catch((errResp) => setErrors({ form: errResp.error || 'Login failed' }));
    }
  };

  return (
    <div className="form-container form-visible">
      <form onSubmit={handleSubmit} className="form">
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
        <button className="form-button">SIGN IN</button>

        <p>
          Dont have an account?{' '}
          <span onClick={() => navigate('/register')} className="underline-link">
            Register
          </span>
        </p>
      </form>
    </div>
  );
}
