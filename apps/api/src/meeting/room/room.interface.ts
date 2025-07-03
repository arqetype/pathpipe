import {
  IConsumer,
  IProducer,
  ITransport,
  IRouter,
} from '../mediasoup/interfaces/media-resources.interface';

export interface IRoom {
  id: string;
  router: IRouter;
  peers: Map<string, Peer>;
}

export interface Peer {
  id: string;
  transports: Map<string, ITransport>;
  producers: Map<string, IProducer>;
  consumers: Map<string, IConsumer>;
}
