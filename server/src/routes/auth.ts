import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db/schema";
import { signToken } from "../lib/jwt";
import { eq } from "drizzle-orm";

const auth = new Hono();

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const { username, email, password } = c.req.valid("json");

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "Email already in use" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
    })
    .returning();

  const token = signToken({ userId: user.id, username: user.username });

  return c.json(
    {
      token,
      user: { id: user.id, username: user.username, email: user.email },
    },
    201,
  );
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  await db
    .update(users)
    .set({ lastSeen: new Date() })
    .where(eq(users.id, user.id));

  const token = signToken({ userId: user.id, username: user.username });

  return c.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
});

export default auth;
