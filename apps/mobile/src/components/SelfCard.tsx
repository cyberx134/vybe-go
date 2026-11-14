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
  onToggleChat: () => void;
  onSwitchCamera: () => void;
  onRetryCamera: () => void;
}

const LABEL: Record<MediaStatus, string> = {
  idle: 'CAMERA OFF',
  requesting: 'STARTING CAMERA…',
  ready: 'YOU',
  denied: 'PERMISSION NEEDED',
};

export function SelfCard({ stream, status, facing, unread, chatOpen, onToggleChat, onSwitchCamera, onRetryCamera }: SelfCardProps) {
  const ready = status === 'ready' && stream !== null;
  const label = ready ? (facing === 'user' ? 'FRONT CAMERA' : 'BACK CAMERA') : LABEL[status];

  return (
    <View style={[styles.card, ready && { backgroundColor: '#07202f' }]} accessibilityLabel="Your camera">
      {!ready && <LinearGradient colors={gradients.self} style={StyleSheet.absoluteFill} />}
      {/* জুম-আউট: contain — পুরো দৃশ্য দেখা যায়। মাইক সবসময় চালু */}
      {ready && <RTCView streamURL={stream.toURL()} style={StyleSheet.absoluteFill} objectFit="contain" mirror={facing === 'user'} />}

      <View style={styles.top}>
        <Pill label={label} light />
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
    flex: 0.92,
    minHeight: 165,
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  top: { position: 'absolute', top: 13, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', gap: 8 },
});
