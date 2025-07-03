import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { RoomService } from './room/room.service';
import { ListMeetingResponseDto } from '@repo/db/dto/meetings/list-meeting.dto';
import { GetMeetingResponseDto } from '@repo/db/dto/meetings/get-meeting.dto';

@Controller('meeting')
export class MeetingController {
  constructor(private readonly roomService: RoomService) {}

  @HttpCode(HttpStatus.OK)
  @Get('all')
  getAllRooms(): ListMeetingResponseDto {
    const rooms = this.roomService.getAllRooms();

    return {
      success: true,
      rooms: rooms.map((room) => ({
        id: room.id,
      })),
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':meetingId')
  getRoomById(@Param('meetingId') meetingId: string): GetMeetingResponseDto {
    const room = this.roomService.getRoom(meetingId);

    if (!room)
      throw new NotFoundException(`Room with ID ${meetingId} not found`);

    return {
      success: true,
      room: {
        id: room.id,
        peers: Array.from(room.peers.keys()),
      },
    };
  }
}
