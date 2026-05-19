import { useState, useRef } from "react";
import { api } from "../lib/api";

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
  conversationId: string;
  members?: Member[];
  currentUserId: string;
  onClose: () => void;
  onResultClick: (messageId: string) => void;
}

export default function MessageSearch({
  conversationId,
  members,
  currentUserId,
  onClose,
  onResultClick,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(
        `/messages/${conversationId}/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const getSenderName = (senderId: string) => {
    if (senderId === currentUserId) return "you";
    return members?.find((m) => m.id === senderId)?.username ?? "unknown";
  };

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q.trim()})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.trim().toLowerCase() ? (
        <span
          key={i}
          style={{
            color: "var(--green)",
            borderBottom: "1px solid var(--green)",
          }}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "300px",
        height: "100vh",
        background: "var(--bg-card)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "var(--green)",
            letterSpacing: "2px",
          }}
        >
          // search messages
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontFamily: "var(--font)",
            fontSize: "11px",
            letterSpacing: "1px",
          }}
        >
          [ x ]
        </button>
      </div>

      {/* Search input */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          ref={inputRef}
          className="retro-input"
          placeholder="search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
          autoFocus
        />
        <button
          className="retro-btn-secondary"
          style={{
            fontSize: "10px",
            letterSpacing: "1px",
            padding: "4px 10px",
            cursor: "pointer",
          }}
          onClick={handleSearch}
        >
          [ go ]
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div
            style={{
              padding: "20px",
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
            }}
          >
            &gt; searching...
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div
            style={{
              padding: "20px",
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
            }}
          >
            &gt; no results found
          </div>
        )}

        {!loading &&
          results.map((msg) => (
            <div
              key={msg.id}
              onClick={() => onResultClick(msg.id)}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--green-ghost)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    letterSpacing: "1px",
                  }}
                >
                  &gt; {getSenderName(msg.senderId)}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.5px",
                  }}
                >
                  {new Date(msg.createdAt).toLocaleDateString([], {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  })}
                </div>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  letterSpacing: "0.5px",
                  lineHeight: "1.5",
                }}
              >
                {highlight(msg.content, query)}
              </div>
            </div>
          ))}
      </div>

      {results.length > 0 && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border)",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "1px",
          }}
        >
          {results.length} result{results.length > 1 ? "s" : ""} found
        </div>
      )}
    </div>
  );
}
