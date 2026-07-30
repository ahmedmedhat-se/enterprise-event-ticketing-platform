import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { WS_URL } from "../../../shared/config/env";

/**
 * Live seat status update received from the server via Socket.IO.
 * The `seatId` is a seat UUID (not a row+number ref).
 */
export interface SeatStatusUpdate {
  seatId: string;
  status: "available" | "held" | "booked";
  eventId: string;
}

interface UseEventSocketOptions {
  eventId: string | undefined;
  accessToken?: string | null;
}

interface UseEventSocketResult {
  heldSeats: Set<string>;
  bookedSeats: Set<string>;
  isConnected: boolean;
  refresh: () => void;
}

export function useEventSocket({
  eventId,
  accessToken,
}: UseEventSocketOptions): UseEventSocketResult {
  const [heldSeats, setHeldSeats] = useState<Set<string>>(new Set());
  const [bookedSeats, setBookedSeats] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const socket: Socket = io(WS_URL, {
      path: "/ws",
      auth: accessToken ? { token: accessToken } : undefined,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("joinEvent", { eventId });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("seatStatusUpdate", (data: SeatStatusUpdate) => {
      if (data.eventId !== eventId) return;

      if (data.status === "held") {
        setHeldSeats((prev) => new Set(prev).add(data.seatId));
        setBookedSeats((prev) => {
          const next = new Set(prev);
          next.delete(data.seatId);
          return next;
        });
      } else if (data.status === "booked") {
        setHeldSeats((prev) => {
          const next = new Set(prev);
          next.delete(data.seatId);
          return next;
        });
        setBookedSeats((prev) => new Set(prev).add(data.seatId));
      } else if (data.status === "available") {
        setHeldSeats((prev) => {
          const next = new Set(prev);
          next.delete(data.seatId);
          return next;
        });
        setBookedSeats((prev) => {
          const next = new Set(prev);
          next.delete(data.seatId);
          return next;
        });
      }
    });

    socketRef.current = socket;

    return () => {
      socket.emit("leaveEvent", { eventId });
      socket.disconnect();
      socketRef.current = null;
      setHeldSeats(new Set());
      setBookedSeats(new Set());
      setIsConnected(false);
    };
  }, [eventId, accessToken]);

  const refresh = useCallback(() => {
    // Re-join the room to re-sync (server could resend current state)
    socketRef.current?.emit("joinEvent", { eventId });
  }, [eventId]);

  return { heldSeats, bookedSeats, isConnected, refresh };
}
