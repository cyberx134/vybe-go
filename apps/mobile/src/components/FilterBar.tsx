import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FILTER_COUNTRIES, type GenderPreference } from '@vybe/shared';
import { Icon } from './Icon';
import { OptionPicker } from './OptionPicker';
import { colors, font, radius } from '../theme';

interface FilterBarProps {
  wantGender: GenderPreference;
  wantCountry: string;
  onCycleGender: () => void;
  onCountry: (country: string) => void;
}

const GENDER_LABEL: Record<GenderPreference, string> = { any: 'Anyone', boy: 'Boy', girl: 'Girl' };

/** শুরু/থামা/পরের — কোনো বাটন নেই; সবকিছু স্লাইডে। এখানে শুধু কাকে খুঁজবেন সেই ফিল্টার। */
export function FilterBar({ wantGender, wantCountry, onCycleGender, onCountry }: FilterBarProps) {
  const [picker, setPicker] = useState(false);
  return (
    <View style={styles.bar} accessibilityLabel="Match filters">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Who you want to meet: ${GENDER_LABEL[wantGender]}. Tap to change`}
        onPress={onCycleGender}
        style={styles.choice}
      >
        <Icon name="gender" size={17} color={colors.surfaceInk} />
        <Text style={styles.text}>{GENDER_LABEL[wantGender]}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Country filter: ${wantCountry}`} onPress={() => setPicker(true)} style={styles.choice}>
        <Icon name="globe" size={17} color={colors.surfaceInk} />
        <Text style={styles.text} numberOfLines={1}>
          {wantCountry}
        </Text>
      </Pressable>
      <OptionPicker visible={picker} title="Meet people from" options={FILTER_COUNTRIES} selected={wantCountry} onSelect={onCountry} onClose={() => setPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 9,
    padding: 11,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  choice: {
    flex: 1,
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.choice,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#ffffffa8',
  },
  text: { color: colors.surfaceInk, fontSize: 12, fontFamily: font.semi, flexShrink: 1 },
});
