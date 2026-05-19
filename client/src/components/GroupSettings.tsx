import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authStore } from "../store/auth";

interface Member {
  id: string;
  username: string;
  role: "member" | "moderator" | "owner";
  joinedAt: string;
}

interface User {
  id: string;
  username: string;
}

interface Props {
  conversationId: string;
  onClose: () => void;
}

export default function GroupSettings({ conversationId, onClose }: Props) {
  const queryClient = useQueryClient();
  const currentUser = authStore.getUser();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members", conversationId],
    queryFn: async () =>
      (await api.get(`/conversations/${conversationId}/members`)).data,
  });

  const currentMember = members.find((m) => m.id === currentUser?.id);
  const isOwner = currentMember?.role === "owner";
  const isModerator = currentMember?.role === "moderator";
  const canManage = isOwner || isModerator;

  const searchUsers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const res = await api.get(`/users/search?q=${q}`);
    const existingIds = members.map((m) => m.id);
    setSearchResults(res.data.filter((u: User) => !existingIds.includes(u.id)));
  };

  const addMember = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/conversations/${conversationId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSearch("");
      setSearchResults([]);
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/conversations/${conversationId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const promoteMember = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/conversations/${conversationId}/members/${userId}/promote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", conversationId] });
    },
  });

  const demoteMember = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/conversations/${conversationId}/members/${userId}/demote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", conversationId] });
    },
  });

  const roleLabel = (role: string) => {
    if (role === "owner") return "[ owner ]";
    if (role === "moderator") return "[ mod ]";
    return "[ member ]";
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "260px",
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
          // group settings
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

      {/* Members list */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid var(--border)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--green)",
            letterSpacing: "2px",
            marginBottom: "10px",
          }}
        >
          &gt; members ({members.length})
        </div>
        {members.map((member) => (
          <div
            key={member.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  letterSpacing: "1px",
                }}
              >
                &gt; {member.username}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  letterSpacing: "1px",
                  marginTop: "2px",
                }}
              >
                {roleLabel(member.role)}
              </div>
            </div>
            {canManage && member.id !== currentUser?.id && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {isOwner && member.role === "member" && (
                  <button
                    className="retro-btn-secondary"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.5px",
                      padding: "3px 6px",
                    }}
                    onClick={() => promoteMember.mutate(member.id)}
                  >
                    [ mod ]
                  </button>
                )}
                {isOwner && member.role === "moderator" && (
                  <button
                    className="retro-btn-secondary"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.5px",
                      padding: "3px 6px",
                    }}
                    onClick={() => demoteMember.mutate(member.id)}
                  >
                    [ demote ]
                  </button>
                )}
                {member.role !== "owner" && (
                  <button
                    className="retro-btn-secondary"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.5px",
                      padding: "3px 6px",
                      color: "var(--error)",
                    }}
                    onClick={() => removeMember.mutate(member.id)}
                  >
                    [ remove ]
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add member */}
      {canManage && (
        <div style={{ padding: "12px" }}>
          <div
            style={{
              fontSize: "10px",
              color: "var(--green)",
              letterSpacing: "2px",
              marginBottom: "10px",
            }}
          >
            &gt; add member
          </div>
          <input
            className="retro-input"
            placeholder="search_username..."
            value={search}
            onChange={(e) => searchUsers(e.target.value)}
          />
          {searchResults.map((u) => (
            <div
              key={u.id}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  letterSpacing: "1px",
                }}
              >
                &gt; {u.username}
              </div>
              <button
                className="retro-btn-secondary"
                style={{
                  fontSize: "10px",
                  letterSpacing: "1px",
                  padding: "4px 8px",
                }}
                onClick={() => addMember.mutate(u.id)}
              >
                [ add ]
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
