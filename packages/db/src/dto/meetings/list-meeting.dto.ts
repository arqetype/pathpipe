import { IsNotEmpty, IsString } from 'class-validator';

export class ListMeetingResponseDto {
  success: true;
  rooms: ListMeetingRoomDto[];
}

class ListMeetingRoomDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}
