import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

/**
 * Socket.IO gateway for real-time seat status updates.
 *
 * Clients connect with a JWT token in the handshake auth:
 *   io('ws://host', { auth: { token: '<jwt>' } })
 *
 * Once connected, they emit:
 *   socket.emit('joinEvent', { eventId: '...' })
 *   socket.emit('leaveEvent', { eventId: '...' })
 *
 * The server pushes seat status changes:
 *   socket.on('seatStatusUpdate', (payload) => { ... })
 *   payload: { seatId: string, status: 'held' | 'available' | 'booked', eventId: string }
 */
@WebSocketGateway({
  path: '/ws',
})
export class HoldsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(HoldsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Authenticate incoming connections via JWT from handshake auth.
   */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token =
        socket.handshake.auth?.token ?? socket.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn('Socket.IO connection rejected: no token provided');
        socket.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<AuthUser>(token);
      // Attach user info to the socket for later reference
      (socket as any).user = payload;

      this.logger.log(
        `Socket.IO client connected: user ${payload.sub} (${payload.role})`,
      );
    } catch {
      this.logger.warn('Socket.IO connection rejected: invalid token');
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(
      `Socket.IO client disconnected: ${(socket as any).user?.sub ?? 'unknown'}`,
    );
  }

  /**
   * Join an event room to receive seat status updates.
   */
  @SubscribeMessage('joinEvent')
  handleJoinEvent(socket: Socket, payload: { eventId: string }): void {
    if (!payload?.eventId) {
      this.logger.warn('joinEvent missing eventId');
      return;
    }

    const roomName = this.roomName(payload.eventId);
    socket.join(roomName);
    this.logger.debug(`Socket joined room ${roomName}`);
  }

  /**
   * Leave an event room.
   */
  @SubscribeMessage('leaveEvent')
  handleLeaveEvent(socket: Socket, payload: { eventId: string }): void {
    if (!payload?.eventId) return;

    const roomName = this.roomName(payload.eventId);
    socket.leave(roomName);
    this.logger.debug(`Socket left room ${roomName}`);
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
    this.server.to(this.roomName(eventId)).emit('seatStatusUpdate', payload);
  }

  /** Build the canonical Socket.IO room name for an event. */
  private roomName(eventId: string): string {
    return `event:${eventId}`;
  }
}
