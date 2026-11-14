import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

interface TopBarProps {
  statusText: string;
  online: boolean;
}

export function TopBar({ statusText, online }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.brand}>
        <Image source={require('../../assets/icon.png')} style={styles.mark} />
        <Text style={styles.name}>
          VYBE <Text style={{ color: colors.cyan }}>GO</Text>
        </Text>
      </View>
      <View style={styles.status} accessibilityRole="text" accessibilityLiveRegion="polite">
        <View style={[styles.dot, !online && { backgroundColor: '#e9b44c' }]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 31, height: 31, borderRadius: 11 },
  name: { color: colors.white, fontSize: 17, fontFamily: font.extra, letterSpacing: 2.2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.statusDot },
  statusText: { color: '#d4edf5', fontSize: 11, fontFamily: font.medium, letterSpacing: 0.4 },
});
