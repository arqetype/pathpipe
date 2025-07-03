import { forwardRef, Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { MediasoupModule } from '../mediasoup/mediasoup.module';

@Module({
  imports: [forwardRef(() => MediasoupModule)],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
