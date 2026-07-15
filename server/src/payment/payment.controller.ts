import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PaymentService } from './payment.service';
import { BookingService } from '../booking/booking.service';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * Payment gateway webhook endpoint.
   *
   * Accepts events from the mock (or real) gateway.
   * For mock mode, expects a payload with:
   * {
   *   type: 'payment_intent.succeeded',
   *   data: {
   *     object: {
   *       id: string,
   *       metadata: { bookingId: string }
   *     }
   *   }
   * }
   *
   * The endpoint is marked @Public() but verifies the webhook signature.
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    // Verify webhook signature (mock: always passes)
    const isValid = this.paymentService.verifyWebhook(payload, signature ?? '');
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventType = payload?.type;
    const eventData = payload?.data?.object;

    if (!eventType || !eventData) {
      throw new BadRequestException('Invalid webhook payload structure');
    }

    switch (eventType) {
      case 'payment_intent.succeeded': {
        const bookingId = eventData.metadata?.bookingId;
        const paymentIntentId = eventData.id;

        if (!bookingId) {
          this.logger.warn(
            'Webhook: payment_intent.succeeded missing bookingId in metadata',
          );
          return { received: false };
        }

        this.logger.log(
          `Webhook: payment succeeded for booking ${bookingId}, intent ${paymentIntentId}`,
        );
        await this.bookingService.confirmBooking(bookingId, paymentIntentId);
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedBookingId = eventData.metadata?.bookingId;
        if (failedBookingId) {
          this.logger.warn(
            `Webhook: payment failed for booking ${failedBookingId}, cancelling booking`,
          );
          try {
            // Look up the booking to find its userId
            const booking =
              await this.bookingService.getBookingById(failedBookingId);
            await this.bookingService.cancelBooking(
              failedBookingId,
              booking.userId,
            );
          } catch (err) {
            this.logger.error(
              `Failed to cancel booking ${failedBookingId} after payment failure: ${(err as Error).message}`,
            );
          }
        }
        break;
      }

      default:
        this.logger.debug(`Webhook: unhandled event type "${eventType}"`);
    }

    return { received: true };
  }
}
