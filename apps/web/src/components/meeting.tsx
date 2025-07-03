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

export default function Meeting(props: MeetingProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteMediaRef = useRef<HTMLDivElement>(null);
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const recvTransportRef = useRef<Transport<AppData> | null>(null);
  const [sendTransport, setSendTransport] = useState<Transport<AppData> | null>(
    null,
  );
  const [recvTransport, setRecvTransport] = useState<Transport<AppData> | null>(
    null,
  );
  const [audioProducer, setAudioProducer] = useState<Producer | null>(null);
  const [videoProducer, setVideoProducer] = useState<Producer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenProducer, setScreenProducer] = useState<Producer | null>(null);

  const joinMeeting = (currentSocket: Socket) => {
    if (!currentSocket) return;

    currentSocket.emit(
      'join-meeting',
      {
        meetingId: props.meeting.id,
        peerId: currentSocket.id,
      },
      async (response) => {
        if (response.error) {
          console.error('Error joining meeting:', response.error);
          return;
        }

        console.log('Joined meeting successfully:', response);

        // TODO type the response correctly
        const {
          sendTransportOptions,
          recvTransportOptions,
          rtpCapabilities,
          existingProducers,
        } = response;

        const newDevice = await createDevice(rtpCapabilities);
        console.log('Device created:', newDevice);
        const newSendTransport = createSendTransport(
          newDevice,
          sendTransportOptions,
          currentSocket,
        );
        console.log('Send transport created:', newSendTransport);
        const newRecvTransport = createRecvTransport(
          newDevice,
          recvTransportOptions,
          currentSocket,
        );
        console.log('Recv transport created:', newRecvTransport);

        const audioTrack = await getLocalAudioStreamAndTrack();

        if (!audioTrack) {
          alert(
            'No audio track found. Please check your microphone permissions.',
          );
          return;
        }

        currentSocket.on('new-producer', handleNewProducer);

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
          return;
        }

        for (const producerInfo of existingProducers) {
          await consume(producerInfo, currentSocket);
          console.log('Consumer created for producer:', producerInfo);
        }

        setJoined(true);
      },
    );
  };

  const createDevice = async (rtpCapabilities: RtpCapabilities) => {
    const newDevice = new mediasoupClient.Device();
    await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
    setDevice(newDevice);
    deviceRef.current = newDevice;
    return newDevice;
  };

  const createSendTransport = (
    device: Device,
    transportOptions: TransportOptions<AppData>,
    currentSocket: Socket,
  ) => {
    console.log('Creating send transport with options:', transportOptions);
    const newSendTransport = device.createSendTransport(transportOptions);

    newSendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      console.log('Send transport connect event triggered');
      console.log('DTLS Parameters received:', dtlsParameters);
      console.log('DTLS Parameters type:', typeof dtlsParameters);
      console.log('DTLS Parameters keys:', Object.keys(dtlsParameters || {}));

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
        currentSocket.emit(
          'connect-transport',
          {
            transportId: newSendTransport.id,
            dtlsParameters,
            roomId: props.meeting.id,
            peerId: currentSocket.id,
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
          currentSocket.emit(
            'produce',
            {
              transportId: newSendTransport.id,
              kind,
              rtpParameters,
              roomId: props.meeting.id,
              peerId: currentSocket.id,
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
    setSendTransport(newSendTransport);
    return newSendTransport;
  };

  const createRecvTransport = (
    device: Device,
    transportOptions: TransportOptions<AppData>,
    currentSocket: Socket,
  ) => {
    const newRecvTransport = device.createRecvTransport(transportOptions);
    newRecvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      console.log('Recv transport connect event triggered');
      try {
        currentSocket.emit(
          'connect-transport',
          {
            transportId: newRecvTransport.id,
            dtlsParameters,
            roomId: props.meeting.id,
            peerId: currentSocket.id,
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
    setRecvTransport(newRecvTransport);
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
    if (!sendTransport) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    setLocalStream(stream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const videoTrack = stream.getVideoTracks()[0];

    // 비디오 Producer 생성
    const newVideoProducer = await sendTransport.produce({ track: videoTrack });
    setVideoProducer(newVideoProducer);
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
    if (!sendTransport) return;

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

    await consume({ producerId, peerId, kind }, socket);
  };

  const consume = async (
    {
      producerId,
      peerId,
      kind,
    }: {
      producerId: string;
      peerId: string;
      kind: MediaKind;
    },
    currentSocket: Socket,
  ) => {
    if (!currentSocket) {
      alert('Socket not initialized');
      return;
    }

    const device = deviceRef.current;
    const recvTransport = recvTransportRef.current;

    if (!device || !recvTransport) {
      console.log('Device or RecvTransport not initialized');
      return;
    }

    currentSocket.emit(
      'consume',
      {
        transportId: recvTransport.id,
        producerId,
        roomId: props.meeting.id,
        peerId: currentSocket.id,
        rtpCapabilities: device.rtpCapabilities,
      },
      async (response) => {
        // TODO: type the response correctly
        if (response.error) {
          console.error('Error consuming:', response.error);
          return;
        }

        const { consumerData } = response;

        const consumer = await recvTransport.consume({
          id: consumerData.id,
          producerId: consumerData.producerId,
          kind: consumerData.kind,
          rtpParameters: consumerData.rtpParameters,
        });

        consumer.resume();

        const remoteStream = new MediaStream();
        remoteStream.addTrack(consumer.track);

        if (consumer.kind === 'video') {
          const videoElement = document.createElement('video');
          videoElement.srcObject = remoteStream;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.width = 200;
          remoteMediaRef.current?.appendChild(videoElement);
        } else if (consumer.kind === 'audio') {
          const audioElement = document.createElement('audio');
          audioElement.srcObject = remoteStream;
          audioElement.autoplay = true;
          audioElement.controls = true;
          remoteMediaRef.current?.appendChild(audioElement);

          try {
            await audioElement.play();
          } catch (err) {
            console.error('Audio playback failed:', err);
          }
        }
      },
    );
  };

  const leaveMeeting = () => {
    if (!socket) return;

    socket.emit('leave-room', (response) => {
      // TODO: type the response correctly
      if (response && response.error) {
        console.error('Error leaving room:', response.error);
        return;
      }
      setJoined(false);
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      if (sendTransport) {
        sendTransport.close();
        setSendTransport(null);
      }
      if (recvTransport) {
        recvTransport.close();
        setRecvTransport(null);
      }
      if (device) {
        setDevice(null);
      }
      socket.off('new-producer', handleNewProducer);
    });
  };

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to the meeting server');
      joinMeeting(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from the meeting server');
    });

    return () => {
      newSocket.disconnect();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div id="remote-media"></div>
      </div>
    </div>
  );
}
