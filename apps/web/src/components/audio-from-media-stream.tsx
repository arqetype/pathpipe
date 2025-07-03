'use client';

import { useEffect, useRef, type HTMLAttributes } from 'react';

export type AudioFromMediaStreamProps = HTMLAttributes<HTMLAudioElement> & {
  stream: MediaStream;
};

export function AudioFromMediaStream({
  stream,
  ...props
}: AudioFromMediaStreamProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} {...props} autoPlay />;
}
