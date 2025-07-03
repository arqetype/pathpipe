import { IsNotEmpty, IsString } from 'class-validator';
import { DtlsParameters } from 'mediasoup/node/lib/types';

export class ConnectTransportDto {
  @IsNotEmpty()
  @IsString()
  roomId: string;

  @IsNotEmpty()
  @IsString()
  peerId: string;

  dtlsParameters: DtlsParameters;

  @IsNotEmpty()
  @IsString()
  transportId: string;
}
