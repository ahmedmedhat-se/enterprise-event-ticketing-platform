import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  async listEvents(@Query() query: ListEventsDto) {
    return this.eventsService.getPublicEvents(query);
  }

  @Roles('organizer')
  @Get('mine')
  async getMyEvents(@CurrentUser() user: AuthUser) {
    return this.eventsService.getOrganizerEvents(user.sub);
  }

  @Public()
  @Get(':id')
  async getEventById(@Param('id', ParseUUIDPipe) id: string) {
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(id, user.sub, dto);
  }

  @Roles('organizer')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.eventsService.deleteEvent(id, user.sub);
    return { message: 'Event deleted successfully' };
  }
}
