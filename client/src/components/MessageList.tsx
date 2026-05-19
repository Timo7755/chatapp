import { useEffect, useRef } from "react";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface Member {
  id: string;
  username: string;
}

interface Props {
  messages: Message[];
  currentUserId: string;
  isGroup?: boolean;
  members?: Member[];
}

export default function MessageList({
  messages,
  currentUserId,
  members,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            letterSpacing: "2px",
          }}
        >
          &gt; no messages yet. say something...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUserId;
        const senderName = isMe
          ? "you"
          : (members?.find((m) => m.id === msg.senderId)?.username ??
            "unknown");

        return (
          <div
            key={msg.id}
            id={`msg-${msg.id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-secondary)",
                letterSpacing: "1px",
                marginBottom: "3px",
                paddingLeft: isMe ? "0" : "2px",
                paddingRight: isMe ? "2px" : "0",
              }}
            >
              &gt; {senderName}
            </div>
            <div
              style={{
                maxWidth: "70%",
                padding: "10px 14px",
                border: `1px solid ${isMe ? "var(--border-bright)" : "var(--border)"}`,
                background: isMe ? "var(--green-ghost)" : "var(--bg-card)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  letterSpacing: "0.5px",
                  lineHeight: "1.5",
                }}
              >
                {msg.content}
              </div>
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                marginTop: "4px",
              }}
            >
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} style={{ height: "1px" }} />
    </div>
  );
}
