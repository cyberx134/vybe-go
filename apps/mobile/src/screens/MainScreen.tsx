import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import InCallManager from 'react-native-incall-manager';
import type { GenderPreference, QueueFilters, ReportReason } from '@vybe/shared';
import { ChatPanel } from '../components/ChatPanel';
import { FilterBar } from '../components/FilterBar';
import { Icon } from '../components/Icon';
import { OpponentCard } from '../components/OpponentCard';
import { ReportSheet } from '../components/ReportSheet';
import { SelfCard } from '../components/SelfCard';
import { StageOverlay } from '../components/StageOverlay';
import { Toast } from '../components/Toast';
import { TopBar } from '../components/TopBar';
import { useEngine } from '../hooks/useEngine';
import { useLocalMedia } from '../hooks/useLocalMedia';
import { useToast } from '../hooks/useToast';
import { saveFilters, type Profile, type SavedFilters } from '../lib/storage';
import { colors, font, gradients } from '../theme';

interface MainScreenProps {
  profile: Profile;
  initialFilters: SavedFilters;
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

export function MainScreen({ profile, initialFilters, onEditProfile }: MainScreenProps) {
  const { engine, state } = useEngine();
  const media = useLocalMedia((stream) => engine.setLocalStream(stream));
  const toast = useToast();

  const [filters, setFilters] = useState(initialFilters);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
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

  // কলের সময় অডিও স্পিকারে
  useEffect(() => {
    if (inCall) {
      InCallManager.start({ media: 'video' });
      InCallManager.setForceSpeakerphoneOn(true);
    } else {
      InCallManager.stop();
    }
    return () => InCallManager.stop();
  }, [inCall]);

  const noticeId = state.notice?.id;
  useEffect(() => {
    if (state.notice) toast.show(state.notice.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  useEffect(() => {
    setHidden(false);
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

  const updateFilters = useCallback((next: SavedFilters) => {
    setFilters(next);
    void saveFilters(next);
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
    setChatOpen(false);
    engine.stop();
  }, [engine]);

  // স্ক্রিনের যেকোনো জায়গায় স্লাইড; হ্যান্ডলার সবসময় সর্বশেষ মান দেখে
  const swipeRef = useRef({ busy, chatOpen, reportOpen, goNext, goStop });
  swipeRef.current = { busy, chatOpen, reportOpen, goNext, goStop };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          const s = swipeRef.current;
          if (s.chatOpen || s.reportOpen || Math.abs(g.dx) < 65) return;
          if (g.dx < 0) void s.goNext();
          else if (s.busy) s.goStop();
        },
      }),
    [],
  );

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

  if (state.banUntil !== null) {
    const when = state.banUntil > 0 ? new Date(state.banUntil).toLocaleString() : null;
    return (
      <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
        <SafeAreaView style={styles.banned}>
          <View style={styles.bannedCard} accessibilityRole="alert">
            <Icon name="block" size={26} />
            <Text style={styles.bannedTitle}>Access paused</Text>
            <Text style={styles.bannedText}>
              Your device was reported by several people for breaking the community rules.
              {when ? ` You can come back after ${when}.` : ' Please try again later.'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const overlay =
    state.phase === 'searching'
      ? { title: 'Finding your next match', text: 'Looking for someone who matches your filters.' }
      : state.phase === 'connecting'
        ? { title: 'Connecting…', text: 'Setting up a secure video link.' }
        : null;

  return (
    <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.app} {...panResponder.panHandlers}>
          <TopBar statusText={STATUS_TEXT[state.phase]} online={state.phase !== 'offline'} />

          <View style={styles.stage}>
            <OpponentCard
              phase={state.phase}
              stream={state.remoteStream}
              partnerCountry={state.partnerCountry}
              online={state.online}
              hidden={hidden}
              onToggleHidden={() => setHidden((h) => !h)}
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
            <StageOverlay visible={overlay !== null} title={overlay?.title ?? ''} text={overlay?.text ?? ''} />
            <ChatPanel open={chatOpen && inCall} messages={state.messages} onClose={() => setChatOpen(false)} onSend={(text) => void engine.sendMessage(text)} />
          </View>

          <FilterBar
            wantGender={filters.wantGender}
            wantCountry={filters.wantCountry}
            onCycleGender={() => {
              const i = GENDER_ORDER.indexOf(filters.wantGender);
              updateFilters({ ...filters, wantGender: GENDER_ORDER[(i + 1) % GENDER_ORDER.length] ?? 'any' });
            }}
            onCountry={(country) => updateFilters({ ...filters, wantCountry: country as SavedFilters['wantCountry'] })}
          />

          <Text style={styles.hint}>
            {HINT[state.phase]}
            {state.phase === 'idle' && (
              <Text onPress={onEditProfile} style={styles.link}>
                {'  ·  Edit profile'}
              </Text>
            )}
          </Text>
        </KeyboardAvoidingView>

        <ReportSheet visible={reportOpen} busy={reportBusy} onClose={() => setReportOpen(false)} onReport={(r, d) => void submitReport(r, d)} onBlock={() => void submitBlock()} />
        <Toast message={toast.message} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, paddingHorizontal: 14, gap: 12 },
  stage: { flex: 1, gap: 10 },
  hint: { textAlign: 'center', color: '#d0e8f2', fontSize: 10, letterSpacing: 0.25, paddingBottom: 8, fontFamily: font.regular },
  link: { textDecorationLine: 'underline' },
  banned: { flex: 1, justifyContent: 'center', padding: 18 },
  bannedCard: { padding: 24, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', gap: 10 },
  bannedTitle: { color: colors.white, fontSize: 18, fontFamily: font.bold },
  bannedText: { color: '#d4edf5', fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: font.regular },
});
