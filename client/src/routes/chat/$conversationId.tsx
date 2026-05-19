import { createFileRoute, redirect } from "@tanstack/react-router";
import { authStore } from "../../store/auth";
import Sidebar from "../../components/Sidebar";
import ChatWindow from "../../components/ChatWindow";

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

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <ChatWindow conversationId={conversationId} />
    </div>
  );
}
