'use client';

import { useEffect, useRef, VideoHTMLAttributes } from 'react';

interface VideoFromMediaStreamProps
  extends VideoHTMLAttributes<HTMLVideoElement> {
  stream: MediaStream;
}

export function VideoFromMediaStream({
  stream,
  ...props
}: VideoFromMediaStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={videoRef} {...props} autoPlay playsInline muted />;
}
