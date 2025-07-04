'use client';

import { GetMeetingResponseDto } from '@repo/db/dto/meetings/get-meeting.dto';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import mediasoupClient, { type Device } from 'mediasoup-client';
import {
  AppData,
  MediaKind,
  Producer,
  RtpCapabilities,
  RtpParameters,
  Transport,
  TransportOptions,
} from 'mediasoup-client/types';
import { VideoFromMediaStream } from './video-from-media-stream';
import { useRouter } from 'next/navigation';

type MeetingProps = {
  meeting: GetMeetingResponseDto['room'];
};

interface SocketResponse {
  error?: string;
  [key: string]: unknown;
}

interface ConsumeResponse {
  error?: string;
  consumerData?: {
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
  };
}

interface JoinMeetingResponse {
  error?: string;
  sendTransportOptions?: TransportOptions<AppData>;
  recvTransportOptions?: TransportOptions<AppData>;
  rtpCapabilities?: RtpCapabilities;
  existingProducers?: Array<{
    producerId: string;
    peerId: string;
    kind: MediaKind;
  }>;
}

export default function Meeting(props: MeetingProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteMediaRef = useRef<HTMLDivElement>(null);

  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport<AppData> | null>(null);
  const recvTransportRef = useRef<Transport<AppData> | null>(null);
  const joinedRef = useRef<boolean>(false);

  const [audioProducer, setAudioProducer] = useState<Producer | null>(null);
  const [videoProducer, setVideoProducer] = useState<Producer | null>(null);
  const [screenProducer, setScreenProducer] = useState<Producer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [remoteVideosSrc, setRemoteVideosSrc] = useState<MediaStream[]>([]);
  const [remoteAudioSrc, setRemoteAudioSrc] = useState<MediaStream[]>([]);
  const router = useRouter();

  const joinMeeting = () => {
    if (!socket || joined || joinedRef.current) {
      return;
    }

    if (!socket.connected) {
      return;
    }

    joinedRef.current = true;

    socket.emit(
      'join-meeting',
      {
        meetingId: props.meeting.id,
        peerId: socket.id,
      },
      async (response: JoinMeetingResponse) => {
        if (response.error) {
          joinedRef.current = false;
          return;
        }

        const {
          sendTransportOptions,
          recvTransportOptions,
          rtpCapabilities,
          existingProducers,
        } = response;

        if (
          !sendTransportOptions ||
          !recvTransportOptions ||
          !rtpCapabilities
        ) {
          joinedRef.current = false;
          return;
        }

        try {
          const newDevice = await createDevice(rtpCapabilities);

          const newSendTransport = createSendTransport(
            newDevice,
            sendTransportOptions,
          );

          createRecvTransport(newDevice, recvTransportOptions);

          if (!newSendTransport) {
            console.error('Failed to create send transport');
            joinedRef.current = false;
            return;
          }

          const audioTrack = await getLocalAudioStreamAndTrack();

          if (!audioTrack) {
            joinedRef.current = false;
            return;
          }

          socket.on('new-producer', handleNewProducer);

          try {
            const audioProducerResult = await newSendTransport.produce({
              track: audioTrack,
            });

            setAudioProducer(audioProducerResult);
          } catch {
            joinedRef.current = false;
            return;
          }

          for (const producerInfo of existingProducers || []) {
            await consume(producerInfo);
          }

          setJoined(true);
        } catch (error) {
          joinedRef.current = false;
        }
      },
    );
  };

  const createDevice = async (rtpCapabilities: RtpCapabilities) => {
    const newDevice = new mediasoupClient.Device();
    await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = newDevice;
    return newDevice;
  };

  const createSendTransport = (
    device: Device,
    transportOptions: TransportOptions<AppData>,
  ) => {
    if (!socket) {
      return null;
    }

    const newSendTransport = device.createSendTransport(transportOptions);

    newSendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      // Validation des dtlsParameters
      if (!dtlsParameters) {
        errback(new Error('DTLS Parameters are undefined'));
        return;
      }

      if (
        !dtlsParameters.fingerprints ||
        !Array.isArray(dtlsParameters.fingerprints)
      ) {
        errback(new Error('DTLS Parameters missing fingerprints'));
        return;
      }

      try {
        socket.emit(
          'connect-transport',
          {
            transportId: newSendTransport.id,
            dtlsParameters,
            roomId: props.meeting.id,
            peerId: socket.id,
          },
          (response: SocketResponse) => {
            if (response.error) {
              errback(new Error(response.error));
            } else {
              callback();
            }
          },
        );
      } catch (error: unknown) {
        errback(error instanceof Error ? error : new Error('Unknown error'));
      }
    });

    newSendTransport.on(
      'produce',
      ({ kind, rtpParameters }, callback, errback) => {
        try {
          socket.emit(
            'produce',
            {
              transportId: newSendTransport.id,
              kind,
              rtpParameters,
              roomId: props.meeting.id,
              peerId: socket.id,
            },
            (producerId: string) => {
              callback({ id: producerId });
            },
          );
        } catch (error) {
          errback(error instanceof Error ? error : new Error('Unknown error'));
        }
      },
    );

    sendTransportRef.current = newSendTransport;
    return newSendTransport;
  };

  const createRecvTransport = (
    device: Device,
    transportOptions: TransportOptions<AppData>,
  ) => {
    if (!socket) {
      return null;
    }

    const newRecvTransport = device.createRecvTransport(transportOptions);
    newRecvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      try {
        socket.emit(
          'connect-transport',
          {
            transportId: newRecvTransport.id,
            dtlsParameters,
            roomId: props.meeting.id,
            peerId: socket.id,
          },
          (response: SocketResponse) => {
            if (response.error) {
              errback(new Error(response.error));
            } else {
              callback();
            }
          },
        );
      } catch (error: unknown) {
        errback(error instanceof Error ? error : new Error('Unknown error'));
      }
    });

    recvTransportRef.current = newRecvTransport;
    return newRecvTransport;
  };

  const getLocalAudioStreamAndTrack = async () => {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const audioTrack = audioStream.getAudioTracks()[0];
    return audioTrack;
  };

  const startCamera = async () => {
    const sendTransport = sendTransportRef.current;
    if (!sendTransport) {
      console.error('Send transport not available');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];

      const newVideoProducer = await sendTransport.produce({
        track: videoTrack,
      });
      setVideoProducer(newVideoProducer);
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (videoProducer) {
      videoProducer.close();
      setVideoProducer(null);
    }
    if (audioProducer) {
      audioProducer.close();
      setAudioProducer(null);
    }
  };

  const startScreenShare = async () => {
    const sendTransport = sendTransportRef.current;
    if (!sendTransport) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = stream.getVideoTracks()[0];

      if (!screenTrack) {
        return;
      }

      const newScreenProducer = await sendTransport.produce({
        track: screenTrack,
      });
      setScreenProducer(newScreenProducer);

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if (screenProducer) {
      screenProducer.close();
      setScreenProducer(null);
    }
  };

  const handleNewProducer = async ({
    producerId,
    peerId,
    kind,
  }: {
    producerId: string;
    peerId: string;
    kind: MediaKind;
  }) => {
    if (!socket) {
      console.error('Socket not initialized in handleNewProducer');
      return;
    }

    await consume({ producerId, peerId, kind });
  };

  const consume = async ({
    producerId,
    peerId,
    kind,
  }: {
    producerId: string;
    peerId: string;
    kind: MediaKind;
  }) => {
    if (!socket) {
      console.error('Socket not initialized in consume');
      return;
    }

    const device = deviceRef.current;
    const recvTransport = recvTransportRef.current;

    if (!device || !recvTransport) {
      return;
    }

    socket.emit(
      'consume',
      {
        transportId: recvTransport.id,
        producerId,
        roomId: props.meeting.id,
        peerId: socket.id,
        rtpCapabilities: device.rtpCapabilities,
      },
      async (response: ConsumeResponse) => {
        if (response.error) {
          return;
        }

        const { consumerData } = response;

        if (!consumerData) {
          return;
        }

        const consumer = await recvTransport.consume({
          id: consumerData.id,
          producerId: consumerData.producerId,
          kind: consumerData.kind,
          rtpParameters: consumerData.rtpParameters,
        });

        consumer.resume();

        const remoteStream = new MediaStream([consumer.track]);

        if (consumer.kind === 'video') {
          setRemoteVideosSrc((prev) => {
            return [...prev, remoteStream];
          });
        } else if (consumer.kind === 'audio') {
          setRemoteAudioSrc((prev) => [...prev, remoteStream]);
        }
      },
    );
  };

  const leaveMeeting = () => {
    if (!socket) return;

    socket.emit('leave-meeting', (response: SocketResponse) => {
      setJoined(false);
      joinedRef.current = false;

      // Clean up remote streams
      setRemoteVideosSrc([]);
      setRemoteAudioSrc([]);

      // Clean up local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      // Clean up transports
      if (sendTransportRef.current) {
        sendTransportRef.current.close();
        sendTransportRef.current = null;
      }
      if (recvTransportRef.current) {
        recvTransportRef.current.close();
        recvTransportRef.current = null;
      }

      // Clean up device
      if (deviceRef.current) {
        deviceRef.current = null;
      }

      // Clean up producers
      if (audioProducer) {
        audioProducer.close();
        setAudioProducer(null);
      }
      if (videoProducer) {
        videoProducer.close();
        setVideoProducer(null);
      }
      if (screenProducer) {
        screenProducer.close();
        setScreenProducer(null);
      }
      socket.off('new-producer', handleNewProducer);
      router.push('/');
    });
  };

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      setSocket(null);
      setJoined(false);
      joinedRef.current = false;
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && socket.connected && !joined && !joinedRef.current) {
      joinMeeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, joined]);

  return (
    <div>
      <h1>Mediasoup Demo</h1>
      <h2>My Id: {socket ? socket.id : 'Not connected'}</h2>
      <h2>Room: {props.meeting.id}</h2>
      {!joined ? (
        <div>
          <p>Joining room ...</p>
        </div>
      ) : (
        <div>
          <button onClick={leaveMeeting} className="p-4 bg-blue-500">
            Leave Room
          </button>
          <button onClick={localStream ? stopCamera : startCamera}>
            {localStream ? 'Stop Camera' : 'Start Camera'}
          </button>
          <button onClick={screenProducer ? stopScreenShare : startScreenShare}>
            {screenProducer ? 'Stop Screen Share' : 'Start Screen Share'}
          </button>
        </div>
      )}
      <div>
        <h2>Local Video</h2>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          width="400"
        ></video>
      </div>
      <div>
        <h2>Remote Media</h2>
        <div id="remote-media" ref={remoteMediaRef}>
          {remoteVideosSrc.map((stream, index) => (
            <VideoFromMediaStream key={index} stream={stream} width="400" />
          ))}
          {remoteAudioSrc.map((stream, index) => (
            <audio
              key={index}
              autoPlay
              controls
              ref={(el) => {
                if (el) el.srcObject = stream;
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
