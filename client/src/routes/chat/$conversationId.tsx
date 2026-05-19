import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { authStore } from "../../store/auth";
import Sidebar from "../../components/Sidebar";
import ChatWindow from "../../components/ChatWindow";
import { useInactivityLogout } from "../../hooks/useInactivityLogout";
import { useCallback } from "react";

export const Route = createFileRoute("/chat/$conversationId")({
  beforeLoad: () => {
    if (!authStore.isLoggedIn()) {
      throw redirect({ to: "/login" });
    }
  },
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    navigate({ to: "/login" });
  }, [navigate]);

  useInactivityLogout(handleLogout);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <ChatWindow conversationId={conversationId} />
    </div>
  );
}
