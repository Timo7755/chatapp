import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import type { AppVariables } from "../lib/types";
import { writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const uploadRoute = new Hono<{ Variables: AppVariables }>();

uploadRoute.use("*", authMiddleware);

uploadRoute.post("/", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Only images are allowed" }, 400);
  }

  // Validate file size — max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "File too large (max 5MB)" }, 400);
  }

  const ext = file.name.split(".").pop();
  const filename = `${randomUUID()}.${ext}`;
  const filepath = path.join(process.cwd(), "uploads", filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return c.json({ url: `/uploads/${filename}` });
});

export default uploadRoute;
