import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import DM_CORE_CONFIG from "@/constant";
import { LocalStorage } from "@/lib/utils";

let adminSocketInstance: Socket | null = null;

function getSocketUrl() {
  const base = DM_CORE_CONFIG.BACKEND_URL || "http://localhost:3000";
  // Strip trailing slash
  const cleanBase = base.replace(/\/+$/, "");
  return `${cleanBase}/admin`;
}

export function getAdminSocket(): Socket {
  if (!adminSocketInstance) {
    const user = LocalStorage.get("rideshare-admin-user");
    const token = user?.access_token;

    adminSocketInstance = io(getSocketUrl(), {
      auth: { token },
      query: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return adminSocketInstance;
}

export function useDashboardSocket() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getAdminSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleSnapshot = (payload: any) => {
      setLastUpdated(new Date());

      if (payload.overview) {
        queryClient.setQueryData(["dashboard-overview"], payload.overview);
      }
      if (payload.queue) {
        queryClient.setQueryData(["dashboard-dispatch-queue", 10], payload.queue);
      }
      if (payload.alerts) {
        queryClient.setQueryData(["dashboard-live-monitoring"], payload.alerts);
      }
      if (payload.supplyDemand) {
        queryClient.setQueryData(["dashboard-supply-demand"], payload.supplyDemand);
      }
      if (payload.recentActivity) {
        queryClient.setQueryData(["dashboard-recent-activity", 10], payload.recentActivity);
      }
      if (payload.fleetMap) {
        queryClient.setQueryData(["dashboard-live-fleet-map"], payload.fleetMap);
      }
    };

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("dashboard:snapshot", handleSnapshot);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("dashboard:snapshot", handleSnapshot);
    };
  }, [queryClient]);

  const requestRefresh = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("dashboard:request_refresh");
    }
  }, []);

  return {
    isConnected,
    lastUpdated,
    requestRefresh,
  };
}
