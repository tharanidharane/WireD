import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, getErrorMessage } from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      email: form.email.trim().toLowerCase(),
      password: form.password.trim()
    };

    if (!payload.email || !payload.password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      const { data } = await authApi.login(payload);
      localStorage.setItem("wired_token", data.token);
      localStorage.setItem("wired_user", JSON.stringify(data.user));
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-block">
          <p className="eyebrow">Wired Chat</p>
          <h1>Sign in to your conversations</h1>
          <span>Real-time messaging with media sharing and friend management.</span>
          <div className="auth-showcase">
            <div className="orbit-card">
              <div className="orbit-ring" />
              <div className="orbit-ring inner" />
              <div className="orbit-center">W</div>
              <span className="orbit-dot dot-one" />
              <span className="orbit-dot dot-two" />
              <span className="orbit-dot dot-three" />
            </div>
            <div className="auth-caption">
              <strong>Message beautifully</strong>
              <p>Fast chats, friend requests, media sharing, and a cleaner flow.</p>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            autoComplete="email"
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            autoComplete="current-password"
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
