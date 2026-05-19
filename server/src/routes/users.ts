import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { users } from "../db/schema";
import { ilike, ne } from "drizzle-orm";
import type { AppVariables } from "../lib/types";

const usersRoute = new Hono<{ Variables: AppVariables }>();

usersRoute.use("*", authMiddleware);

usersRoute.get("/search", async (c) => {
  const query = c.req.query("q");
  const currentUser = c.get("user");

  if (!query || query.length < 2) {
    return c.json({ error: "Query too short" }, 400);
  }

  const results = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      lastSeen: users.lastSeen,
    })
    .from(users)
    .where(ilike(users.username, `%${query}%`))
    .limit(10);

  return c.json(results.filter((u) => u.id !== currentUser.userId));
});

export default usersRoute;
