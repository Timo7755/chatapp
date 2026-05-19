import { createFileRoute, redirect } from "@tanstack/react-router";
import { authStore } from "../../store/auth";
import Sidebar from "../../components/Sidebar";

export const Route = createFileRoute("/chat/")({
  beforeLoad: () => {
    if (!authStore.isLoggedIn()) {
      throw redirect({ to: "/login" });
    }
  },
  component: ChatIndexPage,
});

function ChatIndexPage() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderLeft: "1px solid var(--border)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "24px",
              color: "var(--green)",
              letterSpacing: "4px",
              marginBottom: "8px",
            }}
          >
            CHATTERM<span className="blink">_</span>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              letterSpacing: "2px",
            }}
          >
            &gt; select a conversation to begin...
          </div>
        </div>
      </div>
    </div>
  );
}
