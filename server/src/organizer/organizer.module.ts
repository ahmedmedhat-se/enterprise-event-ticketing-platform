import { Module } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [OrganizerService],
  exports: [OrganizerService],
})
export class OrganizerModule {}
