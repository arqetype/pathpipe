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

  // Core meeting state
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Use refs for mediasoup objects to avoid re-renders and ensure consistency
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport<AppData> | null>(null);
  const recvTransportRef = useRef<Transport<AppData> | null>(null);
  const joinedRef = useRef<boolean>(false);

  // Media producers and streams
  const [audioProducer, setAudioProducer] = useState<Producer | null>(null);
  const [videoProducer, setVideoProducer] = useState<Producer | null>(null);
  const [screenProducer, setScreenProducer] = useState<Producer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Elements for remote media
  const [remoteVideosSrc, setRemoteVideosSrc] = useState<MediaStream[]>([]);
  const [remoteAudioSrc, setRemoteAudioSrc] = useState<MediaStream[]>([]);

  const joinMeeting = () => {
    if (!socket || joined || joinedRef.current) {
      console.log('JoinMeeting early return:', {
        hasSocket: !!socket,
        socketConnected: socket?.connected,
        joined,
        joinedRef: joinedRef.current,
      });
      return;
    }

    if (!socket.connected) {
      console.log('Socket not connected yet, waiting...');
      return;
    }

    console.log('Starting join meeting process...');
    joinedRef.current = true;

    // Add timeout to detect if server doesn't respond
    const timeoutId = setTimeout(() => {
      console.error(
        'Join meeting timeout - server did not respond within 10 seconds',
      );
      joinedRef.current = false;
    }, 10000);

    socket.emit(
      'join-meeting',
      {
        meetingId: props.meeting.id,
        peerId: socket.id,
      },
      async (response: JoinMeetingResponse) => {
        clearTimeout(timeoutId);
        console.log('Received join-meeting response:', response);

        if (response.error) {
          console.error('Error joining meeting:', response.error);
          joinedRef.current = false;
          return;
        }

        console.log('Joined meeting successfully:', response);

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
          console.error(
            'Missing required transport options or RTP capabilities',
          );
          joinedRef.current = false;
          return;
        }

        try {
          const newDevice = await createDevice(rtpCapabilities);
          console.log('Device created:', newDevice);

          const newSendTransport = createSendTransport(
            newDevice,
            sendTransportOptions,
          );
          console.log('Send transport created:', newSendTransport);

          const newRecvTransport = createRecvTransport(
            newDevice,
            recvTransportOptions,
          );
          console.log('Recv transport created:', newRecvTransport);

          if (!newSendTransport) {
            console.error('Failed to create send transport');
            joinedRef.current = false;
            return;
          }

          const audioTrack = await getLocalAudioStreamAndTrack();

          if (!audioTrack) {
            alert(
              'No audio track found. Please check your microphone permissions.',
            );
            joinedRef.current = false;
            return;
          }

          socket.on('new-producer', handleNewProducer);

          console.log('Audio track obtained:', audioTrack);

          try {
            console.log('Attempting to create audio producer...');
            console.log(
              'Send transport state:',
              newSendTransport.connectionState,
            );

            const audioProducerResult = await newSendTransport.produce({
              track: audioTrack,
            });

            console.log('Audio producer created:', audioProducerResult);
            setAudioProducer(audioProducerResult);
          } catch (error) {
            console.error('Error creating audio producer:', error);
            alert(
              'Failed to create audio producer: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            );
            joinedRef.current = false;
            return;
          }

          for (const producerInfo of existingProducers || []) {
            await consume(producerInfo);
            console.log('Consumer created for producer:', producerInfo);
          }

          console.log('Setting joined to true');
          setJoined(true);
        } catch (error) {
          console.error('Error in join meeting process:', error);
          joinedRef.current = false;
        }
      },
    );

    console.log('join-meeting event emitted, waiting for response...');
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
      console.error('Socket not available for send transport creation');
      return null;
    }

    console.log('Creating send transport with options:', transportOptions);
    const newSendTransport = device.createSendTransport(transportOptions);

    newSendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      console.log('Send transport connect event triggered');
      console.log('DTLS Parameters received:', dtlsParameters);

      // Validation des dtlsParameters
      if (!dtlsParameters) {
        console.error('DTLS Parameters are undefined');
        errback(new Error('DTLS Parameters are undefined'));
        return;
      }

      if (
        !dtlsParameters.fingerprints ||
        !Array.isArray(dtlsParameters.fingerprints)
      ) {
        console.error('DTLS Parameters missing fingerprints:', dtlsParameters);
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
            console.log('Connect transport response:', response);
            if (response.error) {
              console.error('Connect transport error:', response.error);
              errback(new Error(response.error));
            } else {
              console.log('Send transport connected successfully');
              callback();
            }
          },
        );
      } catch (error: unknown) {
        console.error('Send transport connect error:', error);
        errback(error instanceof Error ? error : new Error('Unknown error'));
      }
    });

    newSendTransport.on(
      'produce',
      ({ kind, rtpParameters }, callback, errback) => {
        console.log('Send transport produce event triggered for kind:', kind);
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
              console.log('Received producer ID from server:', producerId);
              callback({ id: producerId });
            },
          );
        } catch (error) {
          console.error('Send transport produce error:', error);
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
      console.error('Socket not available for recv transport creation');
      return null;
    }

    const newRecvTransport = device.createRecvTransport(transportOptions);
    newRecvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      console.log('Recv transport connect event triggered');
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
            console.log('Recv transport connect response:', response);
            if (response.error) {
              console.error('Recv transport connect error:', response.error);
              errback(new Error(response.error));
            } else {
              console.log('Recv transport connected successfully');
              callback();
            }
          },
        );
      } catch (error: unknown) {
        console.error('Recv transport connect error:', error);
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

      // 비디오 Producer 생성
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
      console.error('Send transport not available');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = stream.getVideoTracks()[0];

      if (!screenTrack) {
        alert('Failed to get screen track. Please check your permissions.');
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
      console.log('Device or RecvTransport not initialized');
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
          console.error('Error consuming:', response.error);
          return;
        }

        const { consumerData } = response;

        if (!consumerData) {
          console.error('No consumer data received');
          return;
        }

        const consumer = await recvTransport.consume({
          id: consumerData.id,
          producerId: consumerData.producerId,
          kind: consumerData.kind,
          rtpParameters: consumerData.rtpParameters,
        });

        consumer.resume();

        const remoteStream = new MediaStream();
        remoteStream.addTrack(consumer.track);

        console.log(
          `Consumer created for ${consumer.kind} with ID: ${consumer.id}`,
        );

        if (consumer.kind === 'video') {
          setRemoteVideosSrc((prev) => [...prev, remoteStream]);
        } else if (consumer.kind === 'audio') {
          setRemoteAudioSrc((prev) => [...prev, remoteStream]);
        }
      },
    );
  };

  const leaveMeeting = () => {
    if (!socket) return;

    socket.emit('leave-room', (response: SocketResponse) => {
      if (response && response.error) {
        console.error('Error leaving room:', response.error);
        return;
      }

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
    });
  };

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from the meeting server');
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

  // Separate useEffect to handle joining when socket is ready
  useEffect(() => {
    if (socket && socket.connected && !joined && !joinedRef.current) {
      console.log(
        'Connected to the meeting server - attempting to join meeting',
      );
      joinMeeting();
    }
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
          <button onClick={leaveMeeting}>Leave Room</button>
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
            <video
              key={index}
              autoPlay
              playsInline
              ref={(el) => {
                if (el) el.srcObject = stream;
              }}
              width="200"
              style={{ margin: '5px' }}
            />
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
