import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

interface StageOverlayProps {
  visible: boolean;
  title: string;
  text: string;
}

export function StageOverlay({ visible, title, text }: StageOverlayProps) {
  if (!visible) return null;
  return (
    <View style={styles.overlay} accessibilityLiveRegion="polite" pointerEvents="none">
      <View style={styles.dialog}>
        <ActivityIndicator size="large" color="#2389a1" style={{ marginBottom: 14 }} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#092b42a8', borderRadius: 25 },
  dialog: { width: '86%', maxWidth: 330, padding: 23, borderRadius: 23, backgroundColor: colors.surface, alignItems: 'center' },
  title: { color: colors.ink, fontSize: 17, fontFamily: font.bold, marginBottom: 7, textAlign: 'center' },
  text: { color: '#6e8998', fontSize: 12, fontFamily: font.regular, lineHeight: 18, textAlign: 'center' },
});
