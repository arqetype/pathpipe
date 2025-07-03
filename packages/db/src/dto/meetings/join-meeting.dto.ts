import { IsNotEmpty, IsString } from 'class-validator';

export class JoinMeetingDto {
  @IsNotEmpty()
  @IsString()
  meetingId: string;

  @IsNotEmpty()
  @IsString()
  peerId: string;
}
