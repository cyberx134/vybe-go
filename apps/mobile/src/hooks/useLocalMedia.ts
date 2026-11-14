import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaDevices, type MediaStream, type MediaStreamTrack } from 'react-native-webrtc';

export type Facing = 'user' | 'environment';
export type MediaStatus = 'idle' | 'requesting' | 'ready' | 'denied';

type SwitchableTrack = MediaStreamTrack & { _switchCamera?: () => void };

export function useLocalMedia(onStream: (stream: MediaStream | null) => void) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaStatus>('idle');
  const [facing, setFacing] = useState<Facing>('user');
  const streamRef = useRef<MediaStream | null>(null);
  const onStreamRef = useRef(onStream);
  onStreamRef.current = onStream;

  const request = useCallback(async (): Promise<boolean> => {
    setStatus('requesting');
    try {
      const next = await mediaDevices.getUserMedia({
        audio: true,
        // ৪:৩ = সেন্সরের পুরো দৃশ্য (জুম-আউট); মাইক সবসময় চালু
        video: { facingMode: 'user', width: 1280, height: 960, frameRate: 30 },
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = next;
      setStream(next);
      setFacing('user');
      setStatus('ready');
      onStreamRef.current(next);
      return true;
    } catch {
      setStatus('denied');
      return false;
    }
  }, []);

  const switchCamera = useCallback(async (): Promise<boolean> => {
    const track = streamRef.current?.getVideoTracks()[0] as SwitchableTrack | undefined;
    if (!track?._switchCamera) return false;
    track._switchCamera();
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
    return true;
  }, []);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    [],
  );

  return { stream, status, facing, request, switchCamera };
}
