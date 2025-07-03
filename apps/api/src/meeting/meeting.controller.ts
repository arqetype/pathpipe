import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { RoomService } from './room/room.service';

@Controller('meeting')
export class MeetingController {
  constructor(private readonly roomService: RoomService) {}

  @HttpCode(HttpStatus.OK)
  @Get('all')
  getAllRooms() {
    const rooms = this.roomService.getAllRooms();

    return rooms;
  }
}
