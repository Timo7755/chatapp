import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authStore } from "../store/auth";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import GroupSettings from "./GroupSettings";
import MessageSearch from "./MessageSearch";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface ConversationUser {
  id: string;
  username: string;
}

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  otherUser: ConversationUser | null;
  members: ConversationUser[];
}

interface Props {
  conversationId: string;
}

export default function ChatWindow({ conversationId }: Props) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const currentUser = authStore.getUser();

  // Get conversation info from the existing cache
  const { data: conversationList = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => (await api.get("/conversations")).data,
  });

  const conversation = conversationList.find((c) => c.id === conversationId);

  const title = conversation
    ? conversation.isGroup
      ? (conversation.name ?? "unnamed group")
      : (conversation.otherUser?.username ?? "direct message")
    : conversationId.slice(0, 8) + "...";

  const subtitle = conversation?.isGroup
    ? `${conversation.members.length} members`
    : null;

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["messages", conversationId],
    queryFn: async () => (await api.get(`/messages/${conversationId}`)).data,
  });

  useEffect(() => {
    const token = authStore.getToken();
    if (!token) return;

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isUnmounted = false;

    const connect = () => {
      ws = new WebSocket(`ws://localhost:3001?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsReady(true);
        console.log("WS connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (
          data.type === "new_message" &&
          data.message.conversationId === conversationId
        ) {
          queryClient.setQueryData<Message[]>(
            ["messages", conversationId],
            (prev = []) => {
              if (prev.find((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            },
          );
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      };

      ws.onclose = () => {
        setWsReady(false);
        if (!isUnmounted) {
          console.log("WS disconnected, reconnecting in 3s...");
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [conversationId, queryClient]);

  const handleSend = (content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "send_message",
        conversationId,
        content,
      }),
    );
  };

  const handleSearchResultClick = (messageId: string) => {
    setShowSearch(false);
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const markAsRead = useCallback(async () => {
    await api.post(`/conversations/${conversationId}/read`);
    queryClient.invalidateQueries({
      queryKey: ["conversations"],
      refetchType: "all",
    });
  }, [conversationId, queryClient]);

  // Mark as read when conversation opens
  useEffect(() => {
    markAsRead();
  }, [conversationId, markAsRead]);

  // Mark as read when new messages arrive and user is in this conversation
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages.length, markAsRead]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--green)",
              letterSpacing: "2px",
            }}
          >
            &gt; {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                marginTop: "3px",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {conversation?.isGroup && (
            <button
              className="retro-btn-secondary"
              style={{
                fontSize: "14px",
                letterSpacing: "1px",
                padding: "4px 8px",
              }}
              onClick={() => setShowSettings((s) => !s)}
            >
              [ settings ]
            </button>
          )}
          <button
            className="retro-btn-secondary"
            style={{
              fontSize: "10px",
              letterSpacing: "1px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
            onClick={() => {
              setShowSearch((s) => !s);
              setShowSettings(false);
            }}
          >
            [ search ]
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: wsReady ? "var(--green)" : "var(--text-muted)",
              }}
            />
            <span
              style={{
                fontSize: "10px",
                color: wsReady ? "var(--text-secondary)" : "var(--text-muted)",
                letterSpacing: "1px",
              }}
            >
              {wsReady ? "connected" : "connecting..."}
            </span>
          </div>
        </div>
      </div>

      <MessageList
        messages={messages}
        currentUserId={currentUser?.id ?? ""}
        isGroup={conversation?.isGroup}
        members={conversation?.members}
      />
      <MessageInput onSend={handleSend} disabled={!wsReady} />
      {showSettings && conversation?.isGroup && (
        <GroupSettings
          conversationId={conversationId}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showSearch && (
        <MessageSearch
          conversationId={conversationId}
          members={conversation?.members}
          currentUserId={currentUser?.id ?? ""}
          onClose={() => setShowSearch(false)}
          onResultClick={handleSearchResultClick}
        />
      )}
    </div>
  );
}
