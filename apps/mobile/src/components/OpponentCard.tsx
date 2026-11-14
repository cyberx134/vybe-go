import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { RTCView, type MediaStream } from 'react-native-webrtc';
import type { Phase } from '@vybe/client-core';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Pill } from './Pill';
import { colors, font, radius } from '../theme';

interface OpponentCardProps {
  phase: Phase;
  stream: MediaStream | null;
  partnerCountry: string | null;
  online: number;
  hidden: boolean;
  onToggleHidden: () => void;
  onReport: () => void;
}

export function OpponentCard({ phase, stream, partnerCountry, online, hidden, onToggleHidden, onReport }: OpponentCardProps) {
  const inCall = phase === 'connected' || phase === 'connecting';
  const live = phase === 'connected';
  const showVideo = stream !== null && inCall && !hidden;

  return (
    <View style={styles.card} accessibilityLabel="Stranger video">
      <LinearGradient colors={['#1d5b80', '#123f5c', '#0b2c44']} style={StyleSheet.absoluteFill} />

      {/* থামানো/অপেক্ষার সময় সবসময় অ্যাপের লগো */}
      {!(stream !== null && inCall) && <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />}

      {showVideo && <RTCView streamURL={stream.toURL()} style={StyleSheet.absoluteFill} objectFit="contain" mirror={false} />}
      {inCall && hidden && (
        <LinearGradient colors={['#1c5a7c', '#0f3a58']} style={[StyleSheet.absoluteFill, styles.hiddenNote]}>
          <Text style={styles.hiddenText}>Video hidden. Tap the eye to show it again.</Text>
        </LinearGradient>
      )}

      {inCall && (
        <View style={styles.top}>
          <Pill label={live ? 'LIVE' : 'CONNECTING'} dot={live ? 'on' : 'off'} />
          <Pill label={partnerCountry ?? 'Unknown'} icon={<Icon name="globe" size={13} />} />
        </View>
      )}

      {phase === 'idle' && (
        <View style={styles.cue} pointerEvents="none">
          <Text style={styles.cueText}>
            <Text style={{ color: colors.cyan, fontSize: 15 }}>‹ </Text>Swipe left to start{online > 0 ? `  ·  ${online} online` : ''}
          </Text>
        </View>
      )}

      {inCall && (
        <View style={styles.actions}>
          <IconButton name={hidden ? 'eye' : 'eyeOff'} label={hidden ? 'Show video' : 'Hide video'} pressed={hidden} onPress={onToggleHidden} />
          <IconButton name="flag" label="Report this user" danger onPress={onReport} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1.08,
    minHeight: 190,
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  logo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  top: { position: 'absolute', top: 13, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cue: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(9,40,60,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cueText: { color: '#eaf8ff', fontSize: 11, fontFamily: font.semi, letterSpacing: 0.3 },
  actions: { position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', gap: 8 },
  hiddenNote: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  hiddenText: { color: colors.white, fontSize: 12, fontFamily: font.semi, textAlign: 'center' },
});
