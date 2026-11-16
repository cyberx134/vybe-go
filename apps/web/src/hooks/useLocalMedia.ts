import { useCallback, useEffect, useRef, useState } from 'react';

export type Facing = 'user' | 'environment';
export type MediaStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable';

interface Options {
  onStream: (stream: MediaStream | null) => void;
}

const stopStream = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

/** ৪:৩ = অধিকাংশ ফোনে সেন্সরের পুরো (সবচেয়ে চওড়া) দৃশ্য; বাক্সও ৪:৩, তাই ফাঁকা জায়গা থাকে না */
const VIDEO_BASE: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 960 },
  aspectRatio: { ideal: 4 / 3 },
  frameRate: { ideal: 30, max: 30 },
};

/** ডিভাইস জুম সাপোর্ট করলে সর্বনিম্ন জুমে (সবচেয়ে চওড়া দৃশ্যে) নামায় */
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

async function openVideoTrack(extra: MediaTrackConstraints): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO_BASE, ...extra }, audio: false });
  const track = stream.getVideoTracks()[0];
  if (!track) throw new Error('No video track');
  await widestView(track);
  return track;
}

const BACK_LABEL = /back|rear|environment|world/i;
const FRONT_LABEL = /front|user|face|selfie/i;
const SECONDARY_LENS = /ultra|macro|depth|tele|zoom/i;

/** facingMode কাজ না করলে (কিছু ফোনে হয় না) ডিভাইসের তালিকা থেকে অন্য ক্যামেরাটি বাছে */
async function pickOtherCamera(target: Facing, currentDeviceId: string | undefined): Promise<string | null> {
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput' && d.deviceId);
  const others = devices.filter((d) => d.deviceId !== currentDeviceId);
  if (others.length === 0) return null;
  const wanted = target === 'environment' ? BACK_LABEL : FRONT_LABEL;
  const labelled = others.filter((d) => wanted.test(d.label));
  const main = labelled.find((d) => !SECONDARY_LENS.test(d.label));
  return (main ?? labelled[0] ?? others[0])?.deviceId ?? null;
}

/** ক্যামেরা + মাইক ম্যানেজমেন্ট (সামনে/পেছনের ক্যামেরা পরিবর্তনসহ). মাইক সবসময় চালু। */
export function useLocalMedia({ onStream }: Options) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaStatus>('idle');
  const [facing, setFacing] = useState<Facing>('user');
  const streamRef = useRef<MediaStream | null>(null);
  const onStreamRef = useRef(onStream);
  onStreamRef.current = onStream;

  const publish = useCallback((next: MediaStream, nextFacing: Facing) => {
    streamRef.current = next;
    setStream(next);
    setFacing(nextFacing);
    setStatus('ready');
    onStreamRef.current(next);
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return false;
    }
    setStatus('requesting');
    try {
      const audio = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      let video: MediaStreamTrack;
      try {
        video = await openVideoTrack({ facingMode: 'user' });
      } catch (error) {
        audio.getTracks().forEach((t) => t.stop());
        throw error;
      }
      stopStream(streamRef.current);
      publish(new MediaStream([...audio.getAudioTracks(), video]), 'user');
      return true;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      return false;
    }
  }, [publish]);

  /**
   * সামনে ↔ পেছনের ক্যামেরা বদল।
   * কিছু ফোন একসাথে দুটি ক্যামেরা খুলতে দেয় না (তখন সবসময় সামনেরটাই আসত), তাই আগে পুরনো ক্যামেরা বন্ধ করা হয়।
   * মাইকের ট্র্যাক অপরিবর্তিত থাকে, তাই কল চালু থাকলেও অডিও কাটে না।
   */
  const switchCamera = useCallback(async (): Promise<boolean> => {
    const current = streamRef.current;
    if (!current) return false;
    const target: Facing = facing === 'user' ? 'environment' : 'user';
    const audio = current.getAudioTracks();
    const currentDeviceId = current.getVideoTracks()[0]?.getSettings().deviceId;

    current.getVideoTracks().forEach((t) => t.stop());

    let track: MediaStreamTrack | null = null;
    try {
      track = await openVideoTrack({ facingMode: { exact: target } });
    } catch {
      try {
        const deviceId = await pickOtherCamera(target, currentDeviceId);
        if (deviceId) track = await openVideoTrack({ deviceId: { exact: deviceId } });
      } catch {
        track = null;
      }
    }

    if (track) {
      publish(new MediaStream([...audio, track]), target);
      return true;
    }

    // বদল সম্ভব হয়নি — আগের ক্যামেরা ফিরিয়ে আনি
    try {
      const restored = await openVideoTrack(currentDeviceId ? { deviceId: { exact: currentDeviceId } } : { facingMode: facing });
      publish(new MediaStream([...audio, restored]), facing);
    } catch {
      setStatus('unavailable');
    }
    return false;
  }, [facing, publish]);

  useEffect(
    () => () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    },
    [],
  );

  return { stream, status, facing, request, switchCamera };
}
