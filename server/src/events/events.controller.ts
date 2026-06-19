import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { ListEventsDto } from './dto/list-events.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  async listEvents(@Query() query: ListEventsDto) {
    return this.eventsService.getPublicEvents(query);
  }

  @Public()
  @Get(':id')
  async getEventById(@Param('id') id: string) {
    return this.eventsService.getEventById(id);
  }

  @Roles('organizer')
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(user.sub, dto);
  }

  @Roles('organizer')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(id, user.sub, dto);
  }

  @Roles('organizer')
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.eventsService.deleteEvent(id, user.sub);
    return { message: 'Event deleted successfully' };
  }

  @Roles('organizer')
  @Get('mine')
  async getMyEvents(@CurrentUser() user: AuthUser) {
    return this.eventsService.getOrganizerEvents(user.sub);
  }
}
