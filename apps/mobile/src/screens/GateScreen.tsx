import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COUNTRIES, MIN_AGE, type Gender } from '@vybe/shared';
import { Icon } from '../components/Icon';
import { OptionPicker } from '../components/OptionPicker';
import type { Profile } from '../lib/storage';
import { colors, font, gradients } from '../theme';

interface GateScreenProps {
  onAccept: (profile: Profile) => void;
}

const RULES = [
  'No nudity, sexual content or sexual behaviour.',
  'No harassment, hate, threats or bullying.',
  'No spam, scams, advertising or begging.',
  `You must be ${MIN_AGE} or older. Users under ${MIN_AGE} are not allowed.`,
  'Never share personal information such as your address or passwords.',
  'Report anyone who breaks these rules — repeat offenders are banned.',
];

export function GateScreen({ onAccept }: GateScreenProps) {
  const [gender, setGender] = useState<Gender>('boy');
  const [country, setCountry] = useState<Profile['country']>('Bangladesh');
  const [agreed, setAgreed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [picker, setPicker] = useState(false);

  return (
    <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Before you start</Text>

            <Text style={styles.label}>I AM</Text>
            <View style={styles.seg}>
              {(['boy', 'girl'] as const).map((g) => (
                <Pressable key={g} accessibilityRole="button" accessibilityState={{ selected: gender === g }} onPress={() => setGender(g)} style={[styles.segBtn, gender === g && styles.segOn]}>
                  <Text style={[styles.segText, gender === g && { color: colors.surfaceInk }]}>{g === 'boy' ? 'Boy' : 'Girl'}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>I&apos;M FROM</Text>
            <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={styles.field}>
              <Text style={styles.fieldText}>{country}</Text>
              <Icon name="globe" size={17} color={colors.surfaceInk} />
            </Pressable>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              onPress={() => setAgreed((a) => !a)}
              style={styles.agree}
            >
              <View style={[styles.box, agreed && styles.boxOn]}>{agreed && <Icon name="check" size={15} color="#092f49" />}</View>
              <Text style={styles.agreeText}>
                I confirm that I am <Text style={{ fontFamily: font.bold }}>{MIN_AGE} or older</Text> and I agree to follow the community rules.
              </Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={() => setRulesOpen((o) => !o)} style={styles.rules}>
              <Text style={styles.rulesTitle}>Community rules {rulesOpen ? '–' : '+'}</Text>
              {rulesOpen && RULES.map((r) => (
                <Text key={r} style={styles.rule}>
                  {'\u2022  '}
                  {r}
                </Text>
              ))}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!agreed}
              onPress={() => onAccept({ gender, country, acceptedAt: Date.now() })}
              style={[styles.cta, !agreed && { opacity: 0.55 }]}
            >
              <Icon name="shield" size={18} />
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
          </View>

          <Text style={styles.footnote}>
            Video is sent directly between you and the other person. Conversations are not recorded. Reports include the last few chat messages.
          </Text>
        </ScrollView>
      </SafeAreaView>

      <OptionPicker visible={picker} title="I'm from" options={COUNTRIES} selected={country} onSelect={(c) => setCountry(c as Profile['country'])} onClose={() => setPicker(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 16, flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center' },
  logo: { width: 260, height: 260 },
  card: { padding: 20, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.12)' },
  cardTitle: { color: colors.white, fontSize: 15, fontFamily: font.bold, marginBottom: 12 },
  label: { color: '#d4edf5', fontSize: 11, fontFamily: font.semi, letterSpacing: 0.6, marginBottom: 6 },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: colors.pillDark, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  segBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.surface },
  segText: { color: '#d4edf5', fontSize: 13, fontFamily: font.semi },
  field: { height: 46, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#ffffffa8', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  fieldText: { color: colors.surfaceInk, fontSize: 13, fontFamily: font.semi },
  agree: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.cyan },
  agreeText: { flex: 1, color: '#e4f4fa', fontSize: 12, lineHeight: 18, fontFamily: font.regular },
  rules: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: colors.pillDark, marginBottom: 16, gap: 8 },
  rulesTitle: { color: '#d4edf5', fontSize: 12, fontFamily: font.semi },
  rule: { color: '#d4edf5', fontSize: 12, lineHeight: 18, fontFamily: font.regular },
  cta: { height: 46, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 12, fontFamily: font.extra },
  footnote: { textAlign: 'center', color: '#b9dcec', fontSize: 10, lineHeight: 15, paddingHorizontal: 12, fontFamily: font.regular },
});
