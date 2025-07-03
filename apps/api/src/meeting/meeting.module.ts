import { Module } from '@nestjs/common';
import { MeetingGateway } from './meeting.gateway';
import { RoomModule } from './room/room.module';
import { TransportModule } from './transport/transport.module';
import { ProducerConsumerModule } from './producer-consumer/producer-consumer.module';
import { MeetingController } from './meeting.controller';

@Module({
  imports: [RoomModule, TransportModule, ProducerConsumerModule],
  providers: [MeetingGateway],
  controllers: [MeetingController],
})
export class MeetingModule {}
