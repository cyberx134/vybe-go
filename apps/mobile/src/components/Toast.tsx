import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, font } from '../theme';

export function Toast({ message }: { message: string | null }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const last = useRef<string>('');
  if (message) last.current = message;

  useEffect(() => {
    Animated.timing(opacity, { toValue: message ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [message, opacity]);

  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{last.current}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    maxWidth: '88%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: colors.surface,
  },
  text: { color: '#1b4a62', fontSize: 12, fontFamily: font.medium, textAlign: 'center' },
});
