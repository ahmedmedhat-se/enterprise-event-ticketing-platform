import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PaymentService } from '../payment/payment.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('bookings')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Create a new booking.
   * For seated events: provide seatIds[].
   * For general admission: provide quantity.
   * Returns the booking details and a payment intent client secret.
   */
  @Roles('fan', 'organizer')
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    // 1. Create the booking (pending)
    const booking = await this.bookingService.createBooking(user.sub, dto);

    // 2. Generate payment intent
    const amount = Number(booking.grandTotal);
    const paymentIntent = await this.paymentService.createPaymentIntent(
      booking.id,
      amount,
    );

    // 3. Store the payment intent ID on the booking for webhook correlation
    await this.bookingService.updatePaymentId(
      booking.id,
      paymentIntent.paymentIntentId,
    );

    this.logger.log(
      `Booking ${booking.id} created, payment intent ${paymentIntent.paymentIntentId}`,
    );

    return {
      booking: { ...booking, paymentId: paymentIntent.paymentIntentId },
      paymentIntent,
    };
  }

  /**
   * List the current user's bookings with tickets and payment info.
   */
  @Roles('fan', 'organizer')
  @Get()
  async listMine(@CurrentUser() user: AuthUser) {
    return this.bookingService.getUserBookings(user.sub);
  }

  /**
   * Get a single booking by ID with full detail (tickets, seat info, QR payload).
   */
  @Roles('fan', 'organizer')
  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.getBookingById(id, user.sub);
  }

  /**
   * Cancel a booking.
   * Valid for 'pending' or 'confirmed' bookings.
   * Releases seats and issues a mock refund for confirmed bookings.
   */
  @Roles('fan', 'organizer')
  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.bookingService.cancelBooking(id, user.sub);
    return { message: 'Booking cancelled successfully' };
  }
}
