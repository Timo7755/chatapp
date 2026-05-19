import { WebSocket } from "ws";

class WebSocketManager {
  // Map of userId -> their WebSocket connection
  private connections: Map<string, WebSocket> = new Map();

  add(userId: string, ws: WebSocket) {
    this.connections.set(userId, ws);
    console.log(
      `User ${userId} connected. Total connections: ${this.connections.size}`,
    );
  }

  remove(userId: string) {
    this.connections.delete(userId);
    console.log(
      `User ${userId} disconnected. Total connections: ${this.connections.size}`,
    );
  }

  // Send a message to a specific user if they are connected
  sendToUser(userId: string, data: object) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // Send a message to multiple users at once
  sendToUsers(userIds: string[], data: object) {
    for (const userId of userIds) {
      this.sendToUser(userId, data);
    }
  }

  isOnline(userId: string): boolean {
    const ws = this.connections.get(userId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }
}

// Export a single shared instance used across the whole app
export const wsManager = new WebSocketManager();
