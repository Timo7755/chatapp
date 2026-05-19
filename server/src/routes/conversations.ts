import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import {
  conversations,
  conversationMembers,
  messages,
  users,
  conversationReads,
} from "../db/schema";
import { eq, inArray, and, desc, gt, ne } from "drizzle-orm";
import type { AppVariables } from "../lib/types";

const conversationsRoute = new Hono<{ Variables: AppVariables }>();

conversationsRoute.use("*", authMiddleware);

// Get all conversations for current user
conversationsRoute.get("/", async (c) => {
  const { userId } = c.get("user");

  const memberships = await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  if (memberships.length === 0) return c.json([]);

  const conversationIds = memberships.map((m) => m.conversationId!);

  const convs = await db
    .select()
    .from(conversations)
    .where(inArray(conversations.id, conversationIds));

  // For each conversation get members and last message
  const enriched = await Promise.all(
    convs.map(async (conv) => {
      const members = await db
        .select({
          id: users.id,
          username: users.username,
        })
        .from(conversationMembers)
        .innerJoin(users, eq(conversationMembers.userId, users.id))
        .where(eq(conversationMembers.conversationId, conv.id));

      const lastMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Get last read timestamp for this user
      const [readRecord] = await db
        .select()
        .from(conversationReads)
        .where(
          and(
            eq(conversationReads.userId, userId),
            eq(conversationReads.conversationId, conv.id),
          ),
        )
        .limit(1);

      const otherUser = conv.isGroup
        ? null
        : (members.find((m) => m.id !== userId) ?? null);

      const unreadMessages = readRecord
        ? await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conv.id),
                gt(messages.createdAt, readRecord.lastReadAt),
                ne(messages.senderId, userId),
              ),
            )
        : await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conv.id),
                ne(messages.senderId, userId),
              ),
            );

      const unreadCount = unreadMessages.length;

      return {
        ...conv,
        otherUser,
        members,
        lastMessage: lastMessages[0] ?? null,
        unreadCount,
      };
    }),
  );

  // Sort by last message date, newest first
  enriched.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? a.createdAt;
    const bTime = b.lastMessage?.createdAt ?? b.createdAt;
    return new Date(bTime!).getTime() - new Date(aTime!).getTime();
  });

  return c.json(enriched);
});

// Create DM
const dmSchema = z.object({
  targetUserId: z.string().uuid(),
});

conversationsRoute.post("/dm", zValidator("json", dmSchema), async (c) => {
  const { userId } = c.get("user");
  const { targetUserId } = c.req.valid("json");

  // Check if DM already exists between these two users
  const myMemberships = await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  const myConversationIds = myMemberships.map((m) => m.conversationId!);

  if (myConversationIds.length > 0) {
    const theirMemberships = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, targetUserId),
          inArray(conversationMembers.conversationId, myConversationIds),
        ),
      );

    if (theirMemberships.length > 0) {
      const existing = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, theirMemberships[0].conversationId!),
            eq(conversations.isGroup, false),
          ),
        )
        .limit(1);

      if (existing.length > 0) return c.json(existing[0]);
    }
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ isGroup: false, createdBy: userId })
    .returning();

  await db.insert(conversationMembers).values([
    { conversationId: conversation.id, userId },
    { conversationId: conversation.id, userId: targetUserId },
  ]);

  return c.json(conversation, 201);
});

// Create group
const groupSchema = z.object({
  name: z.string().min(1).max(50),
  memberIds: z.array(z.string().uuid()).min(1),
});

conversationsRoute.post(
  "/group",
  zValidator("json", groupSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { name, memberIds } = c.req.valid("json");

    const [conversation] = await db
      .insert(conversations)
      .values({ name, isGroup: true, createdBy: userId })
      .returning();

    const allMembers = [...new Set([userId, ...memberIds])];

    await db.insert(conversationMembers).values(
      allMembers.map((uid) => ({
        conversationId: conversation.id,
        userId: uid,
        role: (uid === userId ? "owner" : "member") as
          | "owner"
          | "moderator"
          | "member",
      })),
    );

    return c.json(conversation, 201);
  },
);

// Mark conversation as read
conversationsRoute.post("/:conversationId/read", async (c) => {
  const { userId } = c.get("user");
  const { conversationId } = c.req.param();

  await db
    .insert(conversationReads)
    .values({ userId, conversationId, lastReadAt: new Date() })
    .onConflictDoUpdate({
      target: [conversationReads.userId, conversationReads.conversationId],
      set: { lastReadAt: new Date() },
    });

  return c.json({ success: true });
});

// Get group members with roles
conversationsRoute.get("/:conversationId/members", async (c) => {
  const { userId } = c.get("user");
  const { conversationId } = c.req.param();

  // Verify requester is a member
  const [membership] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) return c.json({ error: "Forbidden" }, 403);

  const members = await db
    .select({
      id: users.id,
      username: users.username,
      role: conversationMembers.role,
      joinedAt: conversationMembers.joinedAt,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .where(eq(conversationMembers.conversationId, conversationId));

  return c.json(members);
});

// Add member to group (admin only)
conversationsRoute.post(
  "/:conversationId/members",
  zValidator(
    "json",
    z.object({
      userId: z.string().uuid(),
    }),
  ),
  async (c) => {
    const { userId } = c.get("user");
    const { conversationId } = c.req.param();
    const { userId: targetUserId } = c.req.valid("json");

    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      )
      .limit(1);

    // owner and moderator can remove, but moderator cannot remove owner/moderator
    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "moderator")
    ) {
      return c.json({ error: "Not allowed" }, 403);
    }

    await db
      .insert(conversationMembers)
      .values({ conversationId, userId: targetUserId, role: "member" })
      .onConflictDoNothing();

    return c.json({ success: true });
  },
);

// Remove member from group (admin only)
conversationsRoute.delete(
  "/:conversationId/members/:targetUserId",
  async (c) => {
    const { userId } = c.get("user");
    const { conversationId, targetUserId } = c.req.param();

    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      )
      .limit(1);

    // owner and moderator can remove, but moderator cannot remove owner/moderator
    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "moderator")
    ) {
      return c.json({ error: "Not allowed" }, 403);
    }

    // Cannot remove another admin
    const [targetMembership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, targetUserId),
        ),
      )
      .limit(1);

    if (targetMembership?.role === "owner") {
      return c.json({ error: "Cannot remove the owner" }, 403);
    }

    await db
      .delete(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, targetUserId),
        ),
      );

    return c.json({ success: true });
  },
);

// Promote to moderator (owner only)
conversationsRoute.post(
  "/:conversationId/members/:targetUserId/promote",
  async (c) => {
    const { userId } = c.get("user");
    const { conversationId, targetUserId } = c.req.param();

    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership || membership.role !== "owner") {
      return c.json({ error: "Owner only" }, 403);
    }

    await db
      .update(conversationMembers)
      .set({ role: "moderator" as const })
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, targetUserId),
        ),
      );

    return c.json({ success: true });
  },
);

// Demote moderator back to member (owner only)
conversationsRoute.post(
  "/:conversationId/members/:targetUserId/demote",
  async (c) => {
    const { userId } = c.get("user");
    const { conversationId, targetUserId } = c.req.param();

    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership || membership.role !== "owner") {
      return c.json({ error: "Owner only" }, 403);
    }

    await db
      .update(conversationMembers)
      .set({ role: "member" as const })
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, targetUserId),
        ),
      );

    return c.json({ success: true });
  },
);

export default conversationsRoute;
