import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { colors, font, radius } from '../theme';

interface PillProps {
  label: string;
  light?: boolean;
  dot?: 'on' | 'off';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Pill({ label, light, dot, icon, style }: PillProps) {
  return (
    <View style={[styles.pill, light && styles.light, style]}>
      {dot && <View style={[styles.dot, dot === 'off' && styles.dotOff]} />}
      {icon}
      <Text style={[styles.text, light && styles.textLight]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.pillDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  light: { backgroundColor: colors.pillLight, borderColor: '#ffffff80' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.statusDot },
  dotOff: { backgroundColor: '#e9b44c' },
  text: { color: '#f5fcff', fontSize: 11, fontFamily: font.semi },
  textLight: { color: colors.surfaceInk },
});
