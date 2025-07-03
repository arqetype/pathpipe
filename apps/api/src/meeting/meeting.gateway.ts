import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JoinMeetingDto } from '@repo/db/dto/meetings/join-meeting.dto';
import { RoomService } from './room/room.service';
import { TransportService } from './transport/transport.service';
import { ProducerConsumerService } from './producer-consumer/producer-consumer.service';
import { ConnectTransportDto } from '@repo/db/dto/meetings/connect-transport.dto';
import { ProduceDto } from '@repo/db/dto/meetings/produce.dto';
import { ConsumeDto } from '@repo/db/dto/meetings/consume.dto';
import { UsePipes, ValidationPipe } from '@nestjs/common';

@WebSocketGateway()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MeetingGateway {
  constructor(
    private readonly roomService: RoomService,
    private readonly transportService: TransportService,
    private readonly producerConsumerService: ProducerConsumerService,
  ) {}

  @SubscribeMessage('join-meeting')
  async handleJoinChannel(
    @MessageBody() dto: JoinMeetingDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Join meeting request received:', dto);

    const { meetingId, peerId } = dto;

    try {
      const newRoom = await this.roomService.createRoom(meetingId);
      const sendTransportOptions =
        await this.transportService.createWebRtcTransport(
          meetingId,
          peerId,
          'send',
        );

      const recvTransportOptions =
        await this.transportService.createWebRtcTransport(
          meetingId,
          peerId,
          'recv',
        );

      await client.join(meetingId);

      const room = this.roomService.getRoom(meetingId);
      const peerIds = Array.from(room.peers.keys());

      const existingProducers = [];
      for (const [otherPeerId, peer] of room.peers) {
        if (otherPeerId !== peerId) {
          for (const producer of peer.producers.values()) {
            existingProducers.push({
              producerId: producer.producer.id,
              peerId: otherPeerId,
              kind: producer.producer.kind,
            });
          }
        }
      }

      client.emit('update-peer-list', { peerIds });

      client.to(meetingId).emit('new-peer', { peerId });

      return {
        sendTransportOptions,
        recvTransportOptions,
        rtpCapabilities: newRoom.router.router.rtpCapabilities,
        peerIds,
        existingProducers,
      };
    } catch (error) {
      if (error instanceof Error) {
        client.emit('join-room-error', { error: error.message });
      } else {
        client.emit('join-room-error', { error: 'Unknown error occurred' });
      }
    }
  }

  @SubscribeMessage('leave-meeting')
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
    console.log('Leave meeting request received:', client.id);

    const rooms = Array.from(client.rooms);

    for (const roomId of rooms) {
      if (roomId !== client.id) {
        const room = this.roomService.getRoom(roomId);
        if (room) {
          const peer = room.peers.get(client.id);
          if (peer) {
            for (const producer of peer.producers.values()) {
              producer.producer.close();
            }
            for (const consumer of peer.consumers.values()) {
              consumer.consumer.close();
            }
            for (const transport of peer.transports.values()) {
              transport.transport.close();
            }
            room.peers.delete(client.id);
          }
          await client.leave(roomId);

          client.to(roomId).emit('peer-left', { peerId: client.id });
          if (room.peers.size === 0) {
            this.roomService.removeRoom(roomId);
          }
        }
      }
    }
    return { left: true };
  }

  @SubscribeMessage('connect-transport')
  async handleConnectTransport(
    @MessageBody() connectTransportDto: ConnectTransportDto,
  ) {
    console.log('Connect transport request received:', connectTransportDto);

    const { roomId, peerId, dtlsParameters, transportId } = connectTransportDto;
    const room = this.roomService.getRoom(roomId);
    const peer = room?.peers.get(peerId);
    if (!peer) {
      return { error: 'Peer not found' };
    }
    const transportData = peer.transports.get(transportId);
    if (!transportData) {
      return { error: 'Transport not found' };
    }
    await transportData.transport.connect({ dtlsParameters });

    return { connected: true };
  }

  @SubscribeMessage('produce')
  async handleProduce(
    @MessageBody() produceDto: ProduceDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Produce request received:', produceDto);

    const { roomId, peerId, kind, transportId, rtpParameters } = produceDto;

    try {
      const producerId = await this.producerConsumerService.createProducer({
        roomId,
        peerId,
        transportId,
        kind,
        rtpParameters,
      });

      client.to(roomId).emit('new-producer', { producerId, peerId, kind });

      return { producerId };
    } catch (error) {
      if (error instanceof Error) {
        client.emit('produce-error', { error: error.message });
      } else {
        client.emit('produce-error', { error: 'Unknown error occurred' });
      }
    }
  }

  @SubscribeMessage('consume')
  async handleConsume(
    @MessageBody() consumeDto: ConsumeDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Consume request received:', consumeDto);

    const { roomId, peerId, producerId, rtpCapabilities, transportId } =
      consumeDto;

    try {
      const consumerData = await this.producerConsumerService.createConsumer({
        roomId,
        peerId,
        transportId,
        producerId,
        rtpCapabilities,
      });

      return {
        consumerData,
      };
    } catch (error) {
      if (error instanceof Error) {
        client.emit('consume-error', { error: error.message });
      } else {
        client.emit('consume-error', { error: 'Unknown error occurred' });
      }
    }
  }

  @SubscribeMessage('list-rooms')
  handleListRooms(@ConnectedSocket() client: Socket) {
    console.log('List rooms request received:', client.id);

    const rooms = this.roomService.getAllRooms();
    const roomList = rooms.map((room) => ({
      id: room.id,
      peerCount: room.peers.size,
    }));

    console.log('Available rooms:', roomList);

    return {
      rooms: roomList,
    };
  }
}
