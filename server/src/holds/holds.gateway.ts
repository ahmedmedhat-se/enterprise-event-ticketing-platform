import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

/**
 * Native WebSocket gateway for real-time seat status updates.
 *
 * Clients connect with a JWT token in the query string:
 *   ws://host/ws?token=<jwt>
 *
 * Once connected, they send:
 *   ["joinEvent", { eventId: "..." }]
 *   ["leaveEvent", { eventId: "..." }]
 *
 * The server pushes seat status changes:
 *   ["seatStatusUpdate", { seatId: "...", status: "held|available|booked", eventId: "..." }]
 */
@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class HoldsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(HoldsGateway.name);

  @WebSocketServer()
  server: any;

  /**
   * Map of client → Set<eventId> tracking which rooms a client joined.
   */
  private readonly clientRooms = new Map<any, Set<string>>();

  /**
   * Map of room name "event:<eventId>" → Set<client> for broadcasting.
   */
  private readonly eventRooms = new Map<string, Set<any>>();

  constructor(private readonly jwtService: JwtService) {}

  /** Build the canonical room name for an event. */
  private roomName(eventId: string): string {
    return `event:${eventId}`;
  }

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized');
  }

  /**
   * Authenticate incoming connections via JWT from query param `token`.
   */
  async handleConnection(client: any, req: any): Promise<void> {
    try {
      const rawUrl = req.url ?? '';
      const queryIndex = rawUrl.indexOf('?');
      let token: string | null = null;

      if (queryIndex !== -1) {
        const queryString = rawUrl.slice(queryIndex + 1);
        const params = new URLSearchParams(queryString);
        token = params.get('token');
      }

      if (!token) {
        this.logger.warn('WS connection rejected: no token provided');
        client.close(4001, 'Unauthorized');
        return;
      }

      const payload = await this.jwtService.verifyAsync<AuthUser>(token);
      // Attach user info to the client for later reference
      client.user = payload;
      this.clientRooms.set(client, new Set());

      this.logger.log(
        `WS client connected: user ${payload.sub} (${payload.role})`,
      );
    } catch {
      this.logger.warn('WS connection rejected: invalid token');
      client.close(4001, 'Unauthorized');
    }
  }

  handleDisconnect(client: any): void {
    // Remove client from all event rooms it joined
    const rooms = this.clientRooms.get(client);
    if (rooms) {
      for (const eventId of rooms) {
        const roomKey = this.roomName(eventId);
        const room = this.eventRooms.get(roomKey);
        if (room) {
          room.delete(client);
          if (room.size === 0) {
            this.eventRooms.delete(roomKey);
          }
        }
      }
    }
    this.clientRooms.delete(client);

    this.logger.log(`WS client disconnected: ${client.user?.sub ?? 'unknown'}`);
  }

  /**
   * Join an event room to receive seat status updates.
   * Message format (from client):
   *   { event: "joinEvent", data: { eventId: "..." } }
   */
  @SubscribeMessage('joinEvent')
  handleJoinEvent(client: any, payload: { eventId: string }): void {
    if (!payload?.eventId) {
      this.logger.warn('joinEvent missing eventId');
      return;
    }

    const rooms = this.clientRooms.get(client);
    if (!rooms) {
      this.logger.warn('joinEvent from unauthenticated client');
      return;
    }

    const eventId = payload.eventId;
    rooms.add(eventId);

    const roomKey = this.roomName(eventId);
    if (!this.eventRooms.has(roomKey)) {
      this.eventRooms.set(roomKey, new Set());
    }
    this.eventRooms.get(roomKey)!.add(client);

    this.logger.debug(`Client joined room ${roomKey}`);
  }

  /**
   * Leave an event room.
   * Message format (from client):
   *   { event: "leaveEvent", data: { eventId: "..." } }
   */
  @SubscribeMessage('leaveEvent')
  handleLeaveEvent(client: any, payload: { eventId: string }): void {
    if (!payload?.eventId) return;

    const rooms = this.clientRooms.get(client);
    if (!rooms) return;

    const eventId = payload.eventId;
    rooms.delete(eventId);

    const roomKey = this.roomName(eventId);
    const room = this.eventRooms.get(roomKey);
    if (room) {
      room.delete(client);
      if (room.size === 0) {
        this.eventRooms.delete(roomKey);
      }
    }

    this.logger.debug(`Client left room ${roomKey}`);
  }

  /**
   * Broadcast a seat status update to all clients in a specific event room.
   * Called by SeatHoldService after hold/release/extend operations.
   */
  broadcastToEvent(
    eventId: string,
    payload: {
      seatId: string;
      status: 'available' | 'held' | 'booked';
      eventId: string;
    },
  ): void {
    const roomKey = this.roomName(eventId);
    const room = this.eventRooms.get(roomKey);
    if (!room || room.size === 0) return;

    const message = JSON.stringify(['seatStatusUpdate', payload]);

    for (const client of room) {
      try {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(message);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to send WS message to client: ${(err as Error).message}`,
        );
      }
    }
  }
}
