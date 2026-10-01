import { io, Socket } from "socket.io-client";
import { LocalStorage } from "@/lib/utils";
import DM_CORE_CONFIG from "@/constant";
import type { SupportMessage } from "../types";

let socket: Socket | null = null;

export function getSupportSocket(): Socket {
  if (socket && socket.connected) return socket;

  const adminUser = LocalStorage.get("rideshare-admin-user");
  const token = adminUser?.access_token || "";

  const baseUrl = DM_CORE_CONFIG.SERVER_URL.replace(/\/$/, "");
  socket = io(`${baseUrl}/support`, {
    transports: ["websocket", "polling"],
    auth: {
      token: `Bearer ${token}`,
      clientRole: "agent",
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[SupportSocket/Admin] Connected with socketId:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[SupportSocket/Admin] Connection error:", err.message);
  });

  return socket;
}

export function subscribeToTicket(ticketId: string, callbacks: {
  onMessageReceive?: (msg: SupportMessage) => void;
  onStatusChanged?: (data: { ticketId: string; oldStatus: string; newStatus: string; updatedBy: string }) => void;
  onAgentAssigned?: (data: { ticketId: string; agent: { id: string; name: string; avatarUrl?: string } }) => void;
  onTypingStart?: (data: { ticketId: string; userId: string; role: string }) => void;
  onTypingStop?: (data: { ticketId: string; userId: string; role: string }) => void;
  onReadReceipt?: (data: { ticketId: string; messageIds: string[]; readBy: string }) => void;
}) {
  const s = getSupportSocket();

  s.emit("ticket:subscribe", { ticketId });

  if (callbacks.onMessageReceive) {
    s.on("ticket:message_receive", callbacks.onMessageReceive);
  }
  if (callbacks.onStatusChanged) {
    s.on("ticket:status_changed", callbacks.onStatusChanged);
  }
  if (callbacks.onAgentAssigned) {
    s.on("ticket:agent_assigned", callbacks.onAgentAssigned);
  }
  if (callbacks.onTypingStart) {
    s.on("ticket:typing_start", callbacks.onTypingStart);
  }
  if (callbacks.onTypingStop) {
    s.on("ticket:typing_stop", callbacks.onTypingStop);
  }
  if (callbacks.onReadReceipt) {
    s.on("ticket:read_receipt", callbacks.onReadReceipt);
  }

  return () => {
    s.emit("ticket:unsubscribe", { ticketId });
    if (callbacks.onMessageReceive) s.off("ticket:message_receive", callbacks.onMessageReceive);
    if (callbacks.onStatusChanged) s.off("ticket:status_changed", callbacks.onStatusChanged);
    if (callbacks.onAgentAssigned) s.off("ticket:agent_assigned", callbacks.onAgentAssigned);
    if (callbacks.onTypingStart) s.off("ticket:typing_start", callbacks.onTypingStart);
    if (callbacks.onTypingStop) s.off("ticket:typing_stop", callbacks.onTypingStop);
    if (callbacks.onReadReceipt) s.off("ticket:read_receipt", callbacks.onReadReceipt);
  };
}

export function sendTicketMessageSocket(ticketId: string, payload: {
  content: string;
  messageType?: string;
  isInternalNote?: boolean;
  attachments?: any[];
}) {
  const s = getSupportSocket();
  const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  s.emit("ticket:message_send", {
    ticketId,
    clientMsgId,
    ...payload,
  });

  return clientMsgId;
}

export function sendTypingStart(ticketId: string) {
  const s = getSupportSocket();
  s.emit("ticket:typing_start", { ticketId });
}

export function sendTypingStop(ticketId: string) {
  const s = getSupportSocket();
  s.emit("ticket:typing_stop", { ticketId });
}

export function disconnectSupportSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
