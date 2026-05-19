import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { messages, conversationMembers } from "../db/schema";
import { eq, and, asc, ilike } from "drizzle-orm";
import type { AppVariables } from "../lib/types";

const messagesRoute = new Hono<{ Variables: AppVariables }>();

messagesRoute.use("*", authMiddleware);

messagesRoute.get("/:conversationId", async (c) => {
  const { userId } = c.get("user");
  const { conversationId } = c.req.param();

  const membership = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(100);

  return c.json(result);
});

// Search messages in a conversation
messagesRoute.get("/:conversationId/search", async (c) => {
  const { userId } = c.get("user");
  const { conversationId } = c.req.param();
  const query = c.req.query("q");

  if (!query || query.trim().length < 2) {
    return c.json({ error: "Query too short" }, 400);
  }

  // Verify membership
  const membership = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const results = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ilike(messages.content, `%${query.trim()}%`),
      ),
    )
    .orderBy(asc(messages.createdAt))
    .limit(50);

  return c.json(results);
});

export default messagesRoute;
