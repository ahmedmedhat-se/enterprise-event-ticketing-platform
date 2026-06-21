import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, organizerAccounts } from '../database/schema';
import type { Database } from 'src/types/database.types';

@Injectable()
export class OrganizerService {
  constructor(@Inject('DRIZZLE_DB') private readonly db: Database) {}

  async createOrganizer(data: {
    name: string;
    email: string;
    phone?: string | null;
    passwordHash: string;
    businessName: string;
    businessRegistrationNumber: string;
    taxId: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          passwordHash: data.passwordHash,
          role: 'organizer',
        })
        .returning();

      await tx.insert(organizerAccounts).values({
        userId: user.id,
        businessName: data.businessName,
        businessRegistrationNumber: data.businessRegistrationNumber,
        taxId: data.taxId,
      });

      const result = await tx.query.users.findFirst({
        where: eq(users.id, user.id),
        with: { organizerAccount: true },
      });

      if (!result) {
        throw new Error('Failed to load organizer after creation');
      }

      return result;
    });
  }
}
