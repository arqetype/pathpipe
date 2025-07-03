import {
  IsNotEmpty,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DtlsParameters } from 'mediasoup/node/lib/types';

export class ConnectTransportDto {
  @IsNotEmpty()
  @IsString()
  roomId: string;

  @IsNotEmpty()
  @IsString()
  peerId: string;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  dtlsParameters: DtlsParameters;

  @IsNotEmpty()
  @IsString()
  transportId: string;
}
