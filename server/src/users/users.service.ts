import { Injectable, Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { users } from '../database/schema';
import type { Database } from 'src/types/database.types';

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE_DB') private readonly db: Database) {}

  async createFan(data: {
    name: string;
    email: string;
    phone?: string | null;
    passwordHash: string;
  }) {
    const [user] = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        passwordHash: data.passwordHash,
        role: 'fan',
      })
      .returning();

    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.deletedAt) return null;
    return user;
  }

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user || user.deletedAt) return null;
    return user;
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, userId));
  }
}
