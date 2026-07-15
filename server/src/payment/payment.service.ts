import crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Generic payment gateway interface.
 * Implementations can be swapped out later (Stripe, Paymob, etc.).
 */
export interface PaymentGateway {
  createPaymentIntent(
    bookingId: string,
    amount: number,
    currency?: string,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }>;

  verifyWebhook(payload: any, signature: string): boolean;
}

/**
 * Mock payment gateway for development and testing.
 * Simulates a successful payment intent without contacting an external service.
 */
@Injectable()
export class PaymentService implements PaymentGateway {
  private readonly logger = new Logger(PaymentService.name);

  async createPaymentIntent(
    bookingId: string,
    amount: number,
    currency = 'usd',
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    const paymentIntentId = `pi_mock_${Date.now()}_${bookingId.slice(0, 8)}`;
    const clientSecret = `${paymentIntentId}_secret_mock_${crypto.randomBytes(8).toString('hex')}`;

    this.logger.log(
      `[MOCK] Created payment intent ${paymentIntentId} for booking ${bookingId}, amount ${amount} ${currency}`,
    );

    return { clientSecret, paymentIntentId };
  }

  /**
   * Verify a webhook payload signature.
   * In mock mode, always returns true.
   */
  verifyWebhook(_payload: any, _signature: string): boolean {
    return true;
  }

  /**
   * Process a successful payment by calling the BookingService to confirm.
   * This is called either by the webhook handler or directly for mock auto-confirm.
   */
  async processSuccessfulPayment(
    bookingId: string,
    paymentIntentId: string,
  ): Promise<void> {
    this.logger.log(
      `[MOCK] Processing successful payment for booking ${bookingId}, intent ${paymentIntentId}`,
    );
    // The actual confirmation is handled by the controller which imports BookingService
    // This method is kept for future real gateway integration
  }
}
