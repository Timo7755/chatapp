import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../lib/api";
import { authStore } from "../store/auth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        username,
        email,
        password,
      });
      authStore.save(res.data.token, res.data.user);
      navigate({ to: "/chat" });
    } catch (err: unknown) {
      if ((err as any)?.response?.status === 409) {
        setError("// email already in use");
      } else {
        setError("// registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              letterSpacing: "2px",
              marginBottom: "8px",
            }}
          >
            // new user registration
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "var(--green)",
              letterSpacing: "4px",
            }}
          >
            CHATTERM<span className="blink">_</span>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              letterSpacing: "2px",
              marginTop: "6px",
            }}
          >
            &gt; create your account...
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="retro-card">
            <div className="corner-bl" />
            <div className="corner-br" />

            <div style={{ marginBottom: "20px" }}>
              <label className="retro-label">&gt; username</label>
              <input
                className="retro-input"
                type="text"
                placeholder="your_handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="retro-label">&gt; email_address</label>
              <input
                className="retro-input"
                type="email"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label className="retro-label">&gt; password</label>
              <input
                className="retro-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="retro-error">{error}</div>}

            <div
              style={{
                borderTop: "1px solid var(--border)",
                marginBottom: "20px",
                marginTop: error ? "20px" : "0",
              }}
            />

            <button className="retro-btn" type="submit" disabled={loading}>
              {loading ? "[ registering... ]" : "[ register ]"}
            </button>
          </div>
        </form>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "16px",
            fontSize: "11px",
            color: "var(--text-dim)",
            letterSpacing: "1px",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>SYS v0.1.0</span>
          <Link
            to="/login"
            style={{
              color: "var(--green-muted)",
              textDecoration: "none",
              letterSpacing: "1px",
              fontSize: "16px",
            }}
          >
            &gt; have account? login
          </Link>
        </div>
      </div>
    </div>
  );
}
