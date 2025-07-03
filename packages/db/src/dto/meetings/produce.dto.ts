import { IsNotEmpty, IsString } from 'class-validator';
import { MediaKind, RtpParameters } from 'mediasoup/node/lib/types';

export class ProduceDto {
  @IsNotEmpty()
  @IsString()
  roomId: string;

  @IsNotEmpty()
  @IsString()
  peerId: string;

  @IsNotEmpty()
  @IsString()
  transportId: string;

  rtpParameters: RtpParameters;

  @IsNotEmpty()
  kind: MediaKind;
}
