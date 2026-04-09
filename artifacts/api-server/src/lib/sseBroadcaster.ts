import { type Response } from "express";
import { type Socket } from "net";

// Set of all currently connected SSE clients
const clients = new Set<Response>();

/** Flush socket buffer (bypasses any Node.js internal buffering). */
function flushClient(res: Response): void {
  // Corking / uncorking forces an immediate TCP write
  const socket = (res as unknown as { socket?: Socket }).socket;
  if (socket) {
    socket.uncork();
    socket.cork();
  }
  // Some middleware (e.g. compression) expose a flush method
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

/** Register a new SSE client (called once per /api/alerts/sse request). */
export function addSSEClient(res: Response): void {
  clients.add(res);
  res.on("close", () => clients.delete(res));
  // Disable Nagle's algorithm for immediate delivery
  const socket = (res as unknown as { socket?: Socket }).socket;
  socket?.setNoDelay(true);
}

/** Broadcast a named event to every connected SSE client. */
export function broadcastSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const dead: Response[] = [];
  for (const client of clients) {
    try {
      const ok = client.write(payload);
      flushClient(client);
      if (!ok) dead.push(client); // stream not writable
    } catch {
      dead.push(client);
    }
  }
  for (const c of dead) clients.delete(c);
}

/** Send a keep-alive comment to all clients (prevents proxy timeout). */
export function sendHeartbeat(): void {
  const ping = `: heartbeat\n\n`;
  const dead: Response[] = [];
  for (const client of clients) {
    try {
      client.write(ping);
      flushClient(client);
    } catch {
      dead.push(client);
    }
  }
  for (const c of dead) clients.delete(c);
}

// Heartbeat every 20 seconds (under most proxy timeouts)
setInterval(sendHeartbeat, 20_000);
