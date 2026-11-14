import { useCallback, useEffect, useRef, useState } from 'react';

export type Facing = 'user' | 'environment';
export type MediaStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable';

interface Options {
  onStream: (stream: MediaStream | null) => void;
}

const stopStream = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

/**
 * ক্যামেরা সর্বোচ্চ "জুম আউট" (সবচেয়ে চওড়া দৃশ্য) অবস্থায় চালু করা হয়, যাতে ছোট জায়গায় কয়েকজন একসাথে ধরে।
 *  ১) ৪:৩ অনুপাত চাওয়া হয় — অধিকাংশ ফোনে এতে সেন্সরের পুরোটা (বেশি দৃশ্য) আসে
 *  ২) ডিভাইস জুম সাপোর্ট করলে সর্বনিম্ন জুমে নামানো হয়
 */
async function widestView(track: MediaStreamTrack | undefined): Promise<void> {
  if (!track || typeof track.getCapabilities !== 'function') return;
  const caps = track.getCapabilities() as unknown as { zoom?: { min?: number } };
  const min = caps.zoom?.min;
  if (typeof min !== 'number') return;
  try {
    await track.applyConstraints({ advanced: [{ zoom: min } as unknown as MediaTrackConstraintSet] });
  } catch {
    /* জুম নিয়ন্ত্রণ সমর্থিত নয় — সমস্যা নেই */
  }
}

/** ক্যামেরা + মাইক ম্যানেজমেন্ট (সামনে/পেছনের ক্যামেরা পরিবর্তনসহ). মাইক সবসময় চালু। */
export function useLocalMedia({ onStream }: Options) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaStatus>('idle');
  const [facing, setFacing] = useState<Facing>('user');
  const streamRef = useRef<MediaStream | null>(null);
  const onStreamRef = useRef(onStream);
  onStreamRef.current = onStream;

  const acquire = useCallback(async (wanted: Facing): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return false;
    }
    setStatus('requesting');
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: wanted,
          width: { ideal: 1280 },
          height: { ideal: 960 },
          aspectRatio: { ideal: 4 / 3 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      await widestView(next.getVideoTracks()[0]);
      stopStream(streamRef.current);
      streamRef.current = next;
      setStream(next);
      setFacing(wanted);
      setStatus('ready');
      onStreamRef.current(next);
      return true;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      return false;
    }
  }, []);

  const request = useCallback(() => acquire(facing), [acquire, facing]);

  const switchCamera = useCallback(async (): Promise<boolean> => {
    const target: Facing = facing === 'user' ? 'environment' : 'user';
    const ok = await acquire(target);
    if (!ok && streamRef.current) setStatus('ready');
    return ok;
  }, [acquire, facing]);

  useEffect(
    () => () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    },
    [],
  );

  return { stream, status, facing, request, switchCamera };
}
