import { Controller, Post, Delete, Patch, Body, Logger } from '@nestjs/common';
import { SeatHoldService } from './holds.service';
import { HoldsGateway } from './holds.gateway';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('holds')
export class SeatHoldController {
  private readonly logger = new Logger(SeatHoldController.name);

  constructor(
    private readonly seatHoldService: SeatHoldService,
    private readonly holdsGateway: HoldsGateway,
  ) {}

  /**
   * Hold a seat for the current user.
   * Body: { seatId: string, eventId: string }
   */
  @Roles('fan', 'organizer')
  @Post()
  async holdSeat(
    @CurrentUser() user: AuthUser,
    @Body() body: { seatId: string; eventId: string },
  ): Promise<{ message: string }> {
    await this.seatHoldService.holdSeat(user.sub, body.eventId, body.seatId);
    return { message: 'Seat held successfully' };
  }

  /**
   * Release a held seat.
   * Body: { seatId: string, eventId: string }
   */
  @Roles('fan', 'organizer')
  @Delete()
  async releaseHold(
    @CurrentUser() user: AuthUser,
    @Body() body: { seatId: string; eventId: string },
  ): Promise<{ message: string }> {
    await this.seatHoldService.releaseHold(body.seatId, user.sub);
    return { message: 'Seat released' };
  }

  /**
   * Extend the hold on a seat.
   * Body: { seatId: string }
   */
  @Roles('fan', 'organizer')
  @Patch('extend')
  async extendHold(
    @CurrentUser() user: AuthUser,
    @Body() body: { seatId: string },
  ): Promise<{ message: string }> {
    await this.seatHoldService.extendHold(body.seatId, user.sub);
    return { message: 'Hold extended' };
  }
}
