import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, getErrorMessage } from "../services/api";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim()
    };

    if (!payload.name || !payload.email || !payload.password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      const { data } = await authApi.signup(payload);
      localStorage.setItem("wired_token", data.token);
      localStorage.setItem("wired_user", JSON.stringify(data.user));
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-block">
          <p className="eyebrow">Create account</p>
          <h1>Join Wired Chat</h1>
          <span>Set up your account and start chatting with friends instantly.</span>
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
              <strong>Connect with your people</strong>
              <p>Search by email, add friends, and move into real-time conversations.</p>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            autoComplete="name"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
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
            autoComplete="new-password"
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Signup"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
