import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  isGroup: boolean("is_group").default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id").references(() => conversations.id),
    userId: uuid("user_id").references(() => users.id),
    role: text("role", { enum: ["member", "moderator", "owner"] })
      .default("member")
      .notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.conversationId, t.userId] }),
  }),
);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  senderId: uuid("sender_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const conversationReads = pgTable(
  "conversation_reads",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.conversationId] }),
  }),
);
