import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Title from "./Title";
import BackButton from "./BackButton";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState("landing"); // landing | login | register

  useEffect(() => {
    if (location.pathname === "/login") setView("login");
    else if (location.pathname === "/register") setView("register");
    else setView("landing");
  }, [location.pathname]);

  const isAuthView = view !== "landing";

  return (
    <div className="auth-layout">
      {isAuthView && <BackButton onClick={() => navigate("/auth")} />}

      {/* Title */}
      <div className={`auth-title ${isAuthView ? 'auth-title-top-auth' : 'auth-title-top-landing'}`}>
        <Title view={view} />
      </div>

      {/* Landing buttons BELOW the title */}
      {view === "landing" && (
        <div className="auth-landing-buttons">
          <button onClick={() => navigate("/login")} className="form-button">LOGIN</button>
          <button onClick={() => navigate("/register")} className="form-button">REGISTER</button>
        </div>
      )}

      {/* Forms */}
      {view === "login" && <LoginForm />}
      {view === "register" && <RegisterForm />}
    </div>
  );
}
