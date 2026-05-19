import { WebSocket } from "ws";
import { verifyToken } from "../lib/jwt";
import { wsManager } from "./manager";
import { db } from "../db";
import { messages, conversationMembers } from "../db/schema";
import { eq } from "drizzle-orm";

// This is the shape of every message the client sends to the server
interface IncomingMessage {
  type: "send_message";
  conversationId: string;
  content: string;
}

export async function handleConnection(ws: WebSocket, token: string) {
  // Step 1 — verify the token, get the user
  let userId: string;
  let username: string;

  try {
    const payload = verifyToken(token);
    userId = payload.userId;
    username = payload.username;
  } catch {
    // If token is invalid, close the connection immediately
    ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
    ws.close();
    return;
  }

  // Step 2 — register this connection in the manager
  wsManager.add(userId, ws);

  // Step 3 — tell the client they are connected
  ws.send(JSON.stringify({ type: "connected", userId, username }));

  // Step 4 — listen for incoming messages from this client
  ws.on("message", async (raw) => {
    let parsed: IncomingMessage;

    // Parse the incoming JSON string
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    if (parsed.type === "send_message") {
      const { conversationId, content } = parsed;

      if (!conversationId || !content?.trim()) {
        ws.send(JSON.stringify({ type: "error", message: "Missing fields" }));
        return;
      }

      // Step 5 — verify sender is a member of this conversation
      const membership = await db
        .select()
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, conversationId))
        .limit(1);

      if (membership.length === 0) {
        ws.send(JSON.stringify({ type: "error", message: "Forbidden" }));
        return;
      }

      // Step 6 — save the message to the database
      const [saved] = await db
        .insert(messages)
        .values({ conversationId, senderId: userId, content: content.trim() })
        .returning();

      // Step 7 — find all members of this conversation
      const members = await db
        .select()
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, conversationId));

      const memberIds = members.map((m) => m.userId!);

      // Step 8 — push the message to all connected members
      wsManager.sendToUsers(memberIds, {
        type: "new_message",
        message: saved,
      });
    }
  });

  // Step 9 — clean up when the client disconnects
  ws.on("close", () => {
    wsManager.remove(userId);
  });

  // Step 10 — handle errors
  ws.on("error", (err) => {
    console.error(`WebSocket error for user ${userId}:`, err);
    wsManager.remove(userId);
  });
}
