import { IsNotEmpty, IsString } from 'class-validator';
import { RtpCapabilities } from 'mediasoup/node/lib/rtpParametersTypes';

export class ConsumeDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  peerId: string;

  @IsString()
  @IsNotEmpty()
  producerId: string;

  @IsString()
  @IsNotEmpty()
  transportId: string;

  rtpCapabilities: RtpCapabilities;
}
