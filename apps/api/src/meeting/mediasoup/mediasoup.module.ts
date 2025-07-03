import { Module } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service';

@Module({
  providers: [MediasoupService],
  exports: [MediasoupService],
})
export class MediasoupModule {}
