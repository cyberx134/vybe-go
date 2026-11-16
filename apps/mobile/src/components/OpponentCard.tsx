import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
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
  /** ৪:৩ বাক্সের প্রস্থ (MainScreen হিসাব করে); না থাকলে পূর্ণ প্রস্থ */
  boxWidth?: number;
  onReport: () => void;
}

const LOADER = {
  searching: { title: 'Finding your next match', text: 'Looking for someone who matches your filters.' },
  connecting: { title: 'Connecting…', text: 'Setting up a secure video link.' },
} as const;

export function OpponentCard({ phase, stream, partnerCountry, online, boxWidth, onReport }: OpponentCardProps) {
  const inCall = phase === 'connected' || phase === 'connecting';
  const live = phase === 'connected';
  const showVideo = stream !== null && inCall;
  const loader = phase === 'searching' || phase === 'connecting' ? LOADER[phase] : null;

  return (
    <View style={[styles.card, { width: boxWidth ?? '100%' }]} accessibilityLabel="Stranger video">
      <LinearGradient colors={['#1d5b80', '#123f5c', '#0b2c44']} style={StyleSheet.absoluteFill} />

      {/* থামানো/অপেক্ষার সময় সবসময় অ্যাপের লগো */}
      {!showVideo && <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />}

      {showVideo && <RTCView streamURL={stream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={false} />}

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

      {/* ম্যাচিং লোডার শুধু অপনেন্টের বাক্সের ভেতরে — পুরো স্ক্রিনে নয়, কোনো ব্লার নেই */}
      {loader && (
        <LinearGradient colors={['rgba(8,36,56,0)', 'rgba(8,36,56,0.88)']} style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.cyan} />
          <Text style={styles.loaderTitle}>{loader.title}</Text>
          <Text style={styles.loaderText}>{loader.text}</Text>
        </LinearGradient>
      )}

      {inCall && (
        <View style={styles.actions}>
          <IconButton name="flag" label="Report this user" danger onPress={onReport} />
        </View>
      )}
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
  loader: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 34, paddingBottom: 14, paddingHorizontal: 16, alignItems: 'center', gap: 4 },
  loaderTitle: { color: '#eaf8ff', fontSize: 13, fontFamily: font.bold },
  loaderText: { color: 'rgba(234,248,255,0.8)', fontSize: 11, fontFamily: font.regular },
  actions: { position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', gap: 8 },
});
