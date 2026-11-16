import { useEffect, useRef } from 'react';
import type { Phase } from '@vybe/client-core';
import { Icon } from './Icon';

interface OpponentCardProps {
  phase: Phase;
  stream: MediaStream | null;
  partnerCountry: string | null;
  online: number;
  onReport: () => void;
}

const LOADER = {
  searching: { title: 'Finding your next match', text: 'Looking for someone who matches your filters.' },
  connecting: { title: 'Connecting…', text: 'Setting up a secure video link.' },
} as const;

export function OpponentCard({ phase, stream, partnerCountry, online, onReport }: OpponentCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inCall = phase === 'connected' || phase === 'connecting';
  const showVideo = inCall && stream !== null;
  const loader = phase === 'searching' || phase === 'connecting' ? LOADER[phase] : null;
  const live = phase === 'connected';

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  return (
    <section className={showVideo ? 'video-card opponent has-video' : 'video-card opponent'} aria-label="Stranger video">
      {/* থামানো/অপেক্ষার সময় সবসময় অ্যাপের লগো */}
      {!showVideo && <img className="logo-fill" src="/logo.png" alt="VYBE GO — Meet the world" draggable={false} />}

      <video ref={videoRef} autoPlay playsInline style={{ visibility: showVideo ? 'visible' : 'hidden' }} />

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

      {/* ম্যাচিং লোডার শুধু অপনেন্টের বাক্সের ভেতরে — পুরো স্ক্রিনে নয়, কোনো ব্লার নেই */}
      {loader && (
        <div className="card-loader" role="status" aria-live="polite">
          <div className="spinner" />
          <strong>{loader.title}</strong>
          <small>{loader.text}</small>
        </div>
      )}

      {inCall && (
        <div className="video-actions" data-no-swipe>
          <button className="icon-btn danger" type="button" aria-label="Report this user" onClick={onReport}>
            <Icon name="flag" />
          </button>
        </div>
      )}
    </section>
  );
}
