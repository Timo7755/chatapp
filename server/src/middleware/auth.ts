import { createMiddleware } from "hono/factory";
import { verifyToken, JwtPayload } from "../lib/jwt";

type Variables = {
  user: JwtPayload;
};

export const authMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = verifyToken(token);
      c.set("user", payload);
      await next();
    } catch {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
  },
);
