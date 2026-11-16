import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenderPreference, QueueFilters, ReportReason } from '@vybe/shared';
import { BannedScreen } from '../components/BannedScreen';
import { ChatPanel } from '../components/ChatPanel';
import { FilterBar } from '../components/FilterBar';
import { OpponentCard } from '../components/OpponentCard';
import { ReportSheet } from '../components/ReportSheet';
import { SelfCard } from '../components/SelfCard';
import { Toast } from '../components/Toast';
import { TopBar } from '../components/TopBar';
import { useChatEngine } from '../hooks/useChatEngine';
import { useLocalMedia } from '../hooks/useLocalMedia';
import { useSwipe } from '../hooks/useSwipe';
import { useToast } from '../hooks/useToast';
import { loadFilters, saveFilters, type Profile } from '../lib/storage';

interface ChatScreenProps {
  profile: Profile;
  onEditProfile: () => void;
}

const GENDER_ORDER: GenderPreference[] = ['any', 'boy', 'girl'];

const STATUS_TEXT = {
  offline: 'CONNECTING TO SERVER…',
  idle: 'READY TO CONNECT',
  searching: 'SEARCHING',
  connecting: 'CONNECTING',
  connected: 'CONNECTED',
} as const;

const HINT = {
  offline: 'Connecting to the server…',
  idle: 'Swipe left to start · Swipe right to stop',
  searching: 'Searching… swipe right to cancel',
  connecting: 'Connecting… swipe left for next · swipe right to stop',
  connected: 'Swipe left for next · Swipe right to stop',
} as const;

export function ChatScreen({ profile, onEditProfile }: ChatScreenProps) {
  const { engine, state } = useChatEngine();
  const media = useLocalMedia({ onStream: (stream) => engine.setLocalStream(stream) });
  const toast = useToast();

  const [filters, setFilters] = useState(loadFilters);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [unread, setUnread] = useState(0);

  const requestedRef = useRef(false);
  const seenMessages = useRef(0);

  const inCall = state.phase === 'connected' || state.phase === 'connecting';
  const busy = state.phase === 'searching' || inCall;

  // প্রথমবার ঢুকলেই ক্যামেরা ও মাইক চালু — থামানো অবস্থাতেও নিচে ক্যামেরা চালু থাকে
  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    void media.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noticeId = state.notice?.id;
  useEffect(() => {
    if (state.notice) toast.show(state.notice.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  useEffect(() => {
    setUnread(0);
    seenMessages.current = 0;
  }, [state.matchId]);

  useEffect(() => {
    if (!inCall) {
      setChatOpen(false);
      setReportOpen(false);
    }
  }, [inCall]);

  useEffect(() => {
    const total = state.messages.length;
    const fresh = state.messages.slice(seenMessages.current).filter((m) => !m.mine).length;
    seenMessages.current = total;
    if (fresh > 0 && !chatOpen) setUnread((u) => u + fresh);
  }, [state.messages, chatOpen]);

  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  const updateFilters = useCallback((next: typeof filters) => {
    setFilters(next);
    saveFilters(next);
  }, []);

  const buildFilters = useCallback(
    (): QueueFilters => ({
      selfGender: profile.gender,
      selfCountry: profile.country,
      wantGender: filters.wantGender,
      wantCountry: filters.wantCountry,
    }),
    [profile, filters],
  );

  /** ডান থেকে বামে স্লাইড: প্রথমবার = শুরু; পরে = বর্তমান জনকে স্কিপ করে পরের জন */
  const goNext = useCallback(async () => {
    if (!media.stream) {
      const ok = await media.request();
      if (!ok) {
        toast.show('Allow camera and microphone to start');
        return;
      }
    }
    await engine.start(buildFilters());
  }, [media, engine, buildFilters, toast]);

  /** বাম থেকে ডানে স্লাইড: থামা — উপরে লগো, নিচে ক্যামেরা চালু */
  const goStop = useCallback(() => {
    if (!busy) return;
    setChatOpen(false);
    engine.stop();
  }, [busy, engine]);

  useSwipe({
    onLeft: () => void goNext(),
    onRight: goStop,
    disabled: chatOpen || reportOpen || state.banUntil !== null,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatOpen) setChatOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chatOpen]);

  const toggleChat = () => {
    if (!inCall) {
      toast.show('Swipe left to meet someone first');
      return;
    }
    setChatOpen((open) => !open);
  };

  const switchCamera = async () => {
    const ok = await media.switchCamera();
    if (!ok) toast.show('Could not switch the camera');
  };

  const submitReport = async (reason: ReportReason, details: string) => {
    setReportBusy(true);
    const ok = await engine.report(reason, details);
    setReportBusy(false);
    if (ok) setReportOpen(false);
  };

  const submitBlock = async () => {
    setReportBusy(true);
    const ok = await engine.block();
    setReportBusy(false);
    if (ok) setReportOpen(false);
  };

  if (state.banUntil !== null) return <BannedScreen until={state.banUntil} />;

  return (
    <main className="app">
      <TopBar statusText={STATUS_TEXT[state.phase]} online={state.phase !== 'offline'} />

      <section className="stage" aria-label="Video chat">
        <OpponentCard
          phase={state.phase}
          stream={state.remoteStream}
          partnerCountry={state.partnerCountry}
          online={state.online}
          onReport={() => setReportOpen(true)}
        />
        <SelfCard
          stream={media.stream}
          status={media.status}
          facing={media.facing}
          unread={unread}
          chatOpen={chatOpen}
          onToggleChat={toggleChat}
          onSwitchCamera={() => void switchCamera()}
          onRetryCamera={() => void media.request()}
        />
        <ChatPanel open={chatOpen && inCall} messages={state.messages} onClose={() => setChatOpen(false)} onSend={(text) => void engine.sendMessage(text)} />
      </section>

      <FilterBar
        wantGender={filters.wantGender}
        wantCountry={filters.wantCountry}
        onCycleGender={() => {
          const i = GENDER_ORDER.indexOf(filters.wantGender);
          updateFilters({ ...filters, wantGender: GENDER_ORDER[(i + 1) % GENDER_ORDER.length] ?? 'any' });
        }}
        onCountry={(country) => updateFilters({ ...filters, wantCountry: country as typeof filters.wantCountry })}
      />

      <p className="hint">
        {HINT[state.phase]}
        {state.phase === 'idle' && (
          <>
            {' · '}
            <button type="button" data-no-swipe onClick={onEditProfile}>
              Edit profile
            </button>
          </>
        )}
      </p>

      <ReportSheet open={reportOpen} busy={reportBusy} onClose={() => setReportOpen(false)} onReport={(r, d) => void submitReport(r, d)} onBlock={() => void submitBlock()} />
      <Toast message={toast.message} />
    </main>
  );
}
