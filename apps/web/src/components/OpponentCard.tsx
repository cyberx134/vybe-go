import { useEffect, useRef } from 'react';
import type { Phase } from '@vybe/client-core';
import { Icon } from './Icon';

interface OpponentCardProps {
  phase: Phase;
  stream: MediaStream | null;
  partnerCountry: string | null;
  online: number;
  blurred: boolean;
  onToggleBlur: () => void;
  onReport: () => void;
}

export function OpponentCard({ phase, stream, partnerCountry, online, blurred, onToggleBlur, onReport }: OpponentCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inCall = phase === 'connected' || phase === 'connecting';
  const showVideo = inCall && stream !== null;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  const live = phase === 'connected';

  return (
    <section className={showVideo ? 'video-card opponent has-video' : 'video-card opponent'} aria-label="Stranger video">
      {/* থামানো/অপেক্ষার সময় সবসময় অ্যাপের লগো */}
      {!showVideo && <img className="logo-fill" src="/logo.png" alt="VYBE GO — Meet the world" draggable={false} />}

      <video ref={videoRef} autoPlay playsInline className={blurred ? 'video-blur' : undefined} style={{ visibility: showVideo ? 'visible' : 'hidden' }} />
      {blurred && live && <div className="blur-note">Video hidden. Tap the eye to show it again.</div>}

      {inCall && (
        <div className="card-top">
          <span className="pill">
            <span className={live ? 'dot' : 'dot off'} />
            {live ? 'LIVE' : 'CONNECTING'}
          </span>
          <span className="pill">
            <Icon name="globe" size={13} />
            {partnerCountry ?? 'Unknown'}
          </span>
        </div>
      )}

      {phase === 'idle' && (
        <div className="swipe-cue" aria-hidden="true">
          <span className="cue-arrow">‹</span> Swipe left to start
          {online > 0 && <span className="cue-online"> · {online} online</span>}
        </div>
      )}

      {inCall && (
        <div className="video-actions" data-no-swipe>
          <button className="icon-btn" type="button" aria-label={blurred ? 'Show video' : 'Hide video'} aria-pressed={blurred} onClick={onToggleBlur}>
            <Icon name={blurred ? 'eye' : 'eyeOff'} />
          </button>
          <button className="icon-btn danger" type="button" aria-label="Report this user" onClick={onReport}>
            <Icon name="flag" />
          </button>
        </div>
      )}
    </section>
  );
}
