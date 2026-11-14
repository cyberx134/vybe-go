import { useEffect, useRef } from 'react';
import type { Facing, MediaStatus } from '../hooks/useLocalMedia';
import { Icon } from './Icon';

interface SelfCardProps {
  stream: MediaStream | null;
  status: MediaStatus;
  facing: Facing;
  unread: number;
  chatOpen: boolean;
  onToggleChat: () => void;
  onSwitchCamera: () => void;
  onRetryCamera: () => void;
}

const STATUS_LABEL: Record<MediaStatus, string> = {
  idle: 'CAMERA OFF',
  requesting: 'STARTING CAMERA…',
  ready: 'YOU',
  denied: 'PERMISSION NEEDED',
  unavailable: 'CAMERA UNAVAILABLE',
};

export function SelfCard({ stream, status, facing, unread, chatOpen, onToggleChat, onSwitchCamera, onRetryCamera }: SelfCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  const ready = status === 'ready' && stream !== null;
  const label = ready ? (facing === 'user' ? 'FRONT CAMERA' : 'BACK CAMERA') : STATUS_LABEL[status];

  return (
    <section className={ready ? 'video-card self has-video' : 'video-card self'} aria-label="Your camera">
      <div className="video-bg" />
      {/* মাইক সবসময় চালু; ভিডিও muted শুধু নিজের প্রতিধ্বনি আটকাতে */}
      <video ref={videoRef} autoPlay playsInline muted className={facing === 'user' ? 'mirror' : undefined} />
      <div className="card-top">
        <span className="pill light">{label}</span>
        {!ready && status !== 'requesting' && (
          <button type="button" className="pill light" data-no-swipe onClick={onRetryCamera}>
            Enable camera
          </button>
        )}
      </div>
      <div className="video-actions" data-no-swipe>
        <button className="icon-btn" type="button" aria-label="Open chat" aria-pressed={chatOpen} onClick={onToggleChat}>
          <Icon name="chat" />
          {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <button className="icon-btn" type="button" aria-label="Switch camera" onClick={onSwitchCamera}>
          <Icon name="cameraSwitch" />
        </button>
      </div>
    </section>
  );
}
