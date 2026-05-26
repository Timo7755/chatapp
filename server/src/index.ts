import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { WebSocketServer } from "ws";
import { Server } from "http";
import authRoutes from "./routes/auth";
import usersRoute from "./routes/users";
import conversationsRoute from "./routes/conversations";
import messagesRoute from "./routes/messages";
import { handleConnection } from "./ws/handler";
import { serveStatic } from "@hono/node-server/serve-static";
import uploadRoute from "./routes/upload";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

app.route("/api/auth", authRoutes);
app.route("/api/users", usersRoute);
app.route("/api/conversations", conversationsRoute);
app.route("/api/messages", messagesRoute);
app.route("/api/upload", uploadRoute);
app.use("/uploads/*", serveStatic({ root: "./" }));
app.get("/", (c) => c.json({ message: "Chat API running" }));

const server = serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3001,
  },
  (info) => {
    console.log(`HTTP server running on http://localhost:${info.port}`);
    console.log(`WebSocket server running on ws://localhost:${info.port}`);
  },
);

const wss = new WebSocketServer({ server: server as unknown as Server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url!, "http://localhost");
  const token = url.searchParams.get("token");

  if (!token) {
    ws.send(JSON.stringify({ type: "error", message: "No token provided" }));
    ws.close();
    return;
  }

  handleConnection(ws, token);
});
