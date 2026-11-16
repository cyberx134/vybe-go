import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { RTCView, type MediaStream } from 'react-native-webrtc';
import type { Facing, MediaStatus } from '../hooks/useLocalMedia';
import { IconButton } from './IconButton';
import { Pill } from './Pill';
import { gradients, radius } from '../theme';

interface SelfCardProps {
  stream: MediaStream | null;
  status: MediaStatus;
  facing: Facing;
  unread: number;
  chatOpen: boolean;
  /** ৪:৩ বাক্সের প্রস্থ (MainScreen হিসাব করে); না থাকলে পূর্ণ প্রস্থ */
  boxWidth?: number;
  onToggleChat: () => void;
  onSwitchCamera: () => void;
  onRetryCamera: () => void;
}

const LABEL: Record<MediaStatus, string> = {
  idle: 'CAMERA OFF',
  requesting: 'STARTING CAMERA…',
  ready: '',
  denied: 'PERMISSION NEEDED',
};

export function SelfCard({ stream, status, facing, unread, chatOpen, boxWidth, onToggleChat, onSwitchCamera, onRetryCamera }: SelfCardProps) {
  const ready = status === 'ready' && stream !== null;

  return (
    <View style={[styles.card, { width: boxWidth ?? '100%' }, ready && { backgroundColor: '#07202f' }]} accessibilityLabel="Your camera">
      {!ready && <LinearGradient colors={gradients.self} style={StyleSheet.absoluteFill} />}
      {/* ৪:৩ বাক্সে ৪:৩ জুম-আউট ক্যামেরা: ফাঁকাও নেই, কাটাছাঁটও নেই। মাইক সবসময় চালু */}
      {ready && <RTCView streamURL={stream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={facing === 'user'} />}

      <View style={styles.top}>
        {/* ক্যামেরা চালু থাকলে কোনো লেখা নেই; শুধু সমস্যা হলে দেখায় */}
        {!ready && <Pill label={LABEL[status]} light />}
        {!ready && status !== 'requesting' && (
          <Pressable accessibilityRole="button" onPress={onRetryCamera}>
            <Pill label="Enable camera" light />
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        <IconButton name="chat" label="Open chat" pressed={chatOpen} badge={unread} onPress={onToggleChat} />
        <IconButton name="cameraSwitch" label="Switch camera" onPress={onSwitchCamera} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  top: { position: 'absolute', top: 13, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', gap: 8 },
});
