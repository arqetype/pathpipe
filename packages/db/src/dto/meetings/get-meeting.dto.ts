import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class GetMeetingResponseDto {
  @IsBoolean()
  success: true;
  room: RoomDto;
}

class RoomDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  peers: string[];
}
