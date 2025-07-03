import type {
  RtpCodecCapability,
  WebRtcTransportOptions,
} from 'mediasoup/node/lib/types';

export const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 300,
    },
  },
];

export const webRtcTransport_options: WebRtcTransportOptions = {
  listenIps: [
    {
      ip: '127.0.0.1',
      announcedIp: null,
    },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};
