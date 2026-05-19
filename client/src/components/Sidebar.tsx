import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "../lib/api";
import { authStore } from "../store/auth";

interface LastMessage {
  id: string;
  content: string;
  senderId: string;
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
  createdAt: string;
  otherUser: ConversationUser | null;
  members: ConversationUser[];
  lastMessage: LastMessage | null;
  unreadCount: number;
}

interface User {
  id: string;
  username: string;
}

type Tab = "dms" | "groups";

export default function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = authStore.getUser();
  const [tab, setTab] = useState<Tab>("dms");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => (await api.get("/conversations")).data,
  });

  const dms = conversations.filter((c) => !c.isGroup);
  const groups = conversations.filter((c) => c.isGroup);
  const totalUnreadDms = dms.filter((c) => c.unreadCount > 0).length;
  const totalUnreadGroups = groups.filter((c) => c.unreadCount > 0).length;

  const searchUsers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const res = await api.get(`/users/search?q=${q}`);
    setSearchResults(res.data);
  };

  const createDm = useMutation({
    mutationFn: async (targetUserId: string) =>
      (await api.post("/conversations/dm", { targetUserId })).data,
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSearch("");
      setSearchResults([]);
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.id },
      });
    },
  });

  const createGroup = useMutation({
    mutationFn: async () =>
      (
        await api.post("/conversations/group", {
          name: groupName,
          memberIds: selectedUsers.map((u) => u.id),
        })
      ).data,
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setCreatingGroup(false);
      setGroupName("");
      setSelectedUsers([]);
      setSearch("");
      setSearchResults([]);
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.id },
      });
    },
  });

  const handleLogout = () => {
    authStore.clear();
    navigate({ to: "/login" });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      : d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  };

  const truncate = (str: string, n: number) =>
    str.length > n ? str.slice(0, n) + "..." : str;

  const UnreadBadge = ({ count }: { count: number }) =>
    count > 0 ? (
      <div
        style={{
          fontSize: "10px",
          color: "var(--green)",
          border: "1px solid var(--border-bright)",
          padding: "1px 5px",
          letterSpacing: "0.5px",
        }}
      >
        {count} msg{count > 1 ? "s" : ""}
      </div>
    ) : null;
  return (
    <div
      style={{
        width: "280px",
        minWidth: "280px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontSize: "16px",
            color: "var(--green)",
            letterSpacing: "3px",
          }}
        >
          CHATTERM<span className="blink">_</span>
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
            letterSpacing: "1px",
            marginTop: "4px",
          }}
        >
          &gt; {currentUser?.username}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {(["dms", "groups"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setCreatingGroup(false);
              setSearch("");
              setSearchResults([]);
            }}
            style={{
              flex: 1,
              padding: "10px 4px",
              background: "transparent",
              border: "none",
              borderBottom:
                tab === t
                  ? "1px solid var(--border-bright)"
                  : "1px solid transparent",
              color: tab === t ? "var(--green)" : "var(--text-secondary)",
              fontFamily: "var(--font)",
              fontSize: "10px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {t === "dms"
              ? `dms${totalUnreadDms > 0 ? ` [${totalUnreadDms}]` : ""}`
              : `groups${totalUnreadGroups > 0 ? ` [${totalUnreadGroups}]` : ""}`}
          </button>
        ))}
      </div>

      {/* DMs tab */}
      {tab === "dms" && (
        <>
          <div
            style={{ padding: "10px", borderBottom: "1px solid var(--border)" }}
          >
            <input
              className="retro-input"
              placeholder="&gt; search user..."
              value={search}
              onChange={(e) => searchUsers(e.target.value)}
            />
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{ borderBottom: "1px solid var(--border)" }}>
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: "10px 16px",
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
                    onClick={() => createDm.mutate(u.id)}
                  >
                    [ dm ]
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* DM list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {dms.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                }}
              >
                &gt; no direct messages yet...
              </div>
            ) : (
              dms.map((conv) => (
                <Link
                  key={conv.id}
                  to="/chat/$conversationId"
                  params={{ conversationId: conv.id }}
                  style={{ textDecoration: "none" }}
                >
                  {({ isActive }) => (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        background: isActive
                          ? "var(--green-ghost)"
                          : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: isActive
                              ? "var(--green)"
                              : "var(--text-secondary)",
                            letterSpacing: "1px",
                          }}
                        >
                          {isActive ? "> " : "  "}
                          {conv.otherUser?.username ?? "unknown"}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <UnreadBadge count={conv.unreadCount} />
                          {conv.lastMessage && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--text-muted)",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {formatTime(conv.lastMessage.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      {conv.lastMessage && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.5px",
                            paddingLeft: "2px",
                          }}
                        >
                          {conv.lastMessage.senderId === currentUser?.id
                            ? "you: "
                            : ""}
                          {truncate(conv.lastMessage.content, 28)}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </>
      )}

      {/* Groups tab */}
      {tab === "groups" && (
        <>
          <div
            style={{ padding: "10px", borderBottom: "1px solid var(--border)" }}
          >
            {!creatingGroup ? (
              <button
                className="retro-btn-secondary"
                style={{
                  width: "100%",
                  fontSize: "10px",
                  letterSpacing: "1px",
                  padding: "7px",
                }}
                onClick={() => setCreatingGroup(true)}
              >
                [ + new group ]
              </button>
            ) : (
              <button
                className="retro-btn-secondary"
                style={{
                  width: "100%",
                  fontSize: "10px",
                  letterSpacing: "1px",
                  padding: "7px",
                }}
                onClick={() => {
                  setCreatingGroup(false);
                  setGroupName("");
                  setSelectedUsers([]);
                  setSearch("");
                  setSearchResults([]);
                }}
              >
                [ cancel ]
              </button>
            )}
          </div>

          {/* Group creator */}
          {creatingGroup && (
            <div
              style={{
                padding: "10px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <input
                className="retro-input"
                placeholder="group_name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <input
                className="retro-input"
                placeholder="&gt; search users..."
                value={search}
                onChange={(e) => searchUsers(e.target.value)}
              />
              {selectedUsers.length > 0 && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    letterSpacing: "1px",
                  }}
                >
                  &gt; {selectedUsers.map((u) => u.username).join(", ")}
                </div>
              )}
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border)",
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
                      padding: "3px 6px",
                    }}
                    onClick={() =>
                      setSelectedUsers((prev) =>
                        prev.find((p) => p.id === u.id)
                          ? prev.filter((p) => p.id !== u.id)
                          : [...prev, u],
                      )
                    }
                  >
                    {selectedUsers.find((s) => s.id === u.id)
                      ? "[ - ]"
                      : "[ + ]"}
                  </button>
                </div>
              ))}
              {selectedUsers.length > 0 && groupName && (
                <button
                  className="retro-btn"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "2px",
                    padding: "8px",
                  }}
                  onClick={() => createGroup.mutate()}
                >
                  [ create ]
                </button>
              )}
            </div>
          )}

          {/* Groups list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {groups.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                }}
              >
                &gt; no groups yet...
              </div>
            ) : (
              groups.map((conv) => (
                <Link
                  key={conv.id}
                  to="/chat/$conversationId"
                  params={{ conversationId: conv.id }}
                  style={{ textDecoration: "none" }}
                >
                  {({ isActive }) => (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        background: isActive
                          ? "var(--green-ghost)"
                          : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: isActive
                              ? "var(--green)"
                              : "var(--text-secondary)",
                            letterSpacing: "1px",
                          }}
                        >
                          {isActive ? "> " : "  "}
                          {conv.name ?? "unnamed group"}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <UnreadBadge count={conv.unreadCount} />
                          {conv.lastMessage && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--text-muted)",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {formatTime(conv.lastMessage.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      {conv.lastMessage && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.5px",
                            paddingLeft: "2px",
                          }}
                        >
                          {conv.members.find(
                            (m) => m.id === conv.lastMessage?.senderId,
                          )?.username ?? "unknown"}
                          : {truncate(conv.lastMessage.content, 22)}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
        <button
          className="retro-btn-secondary"
          style={{
            width: "100%",
            fontSize: "11px",
            letterSpacing: "2px",
            padding: "8px",
          }}
          onClick={handleLogout}
        >
          [ logout ]
        </button>
      </div>
    </div>
  );
}
