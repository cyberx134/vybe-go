import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LIMITS, REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from '@vybe/shared';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { colors, font } from '../theme';

interface ReportSheetProps {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onReport: (reason: ReportReason, details: string) => void;
  onBlock: () => void;
}

export function ReportSheet({ visible, busy, onClose, onReport, onBlock }: ReportSheetProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Report this user</Text>
            <IconButton name="close" label="Close" size={34} onPress={onClose} />
          </View>
          <Text style={styles.sub}>
            Tell us what happened. Your report and the latest chat messages are sent to our safety team. The other person is never told who reported them.
          </Text>

          <View style={styles.chips}>
            {REPORT_REASONS.map((r) => {
              const active = reason === r;
              return (
                <Pressable key={r} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setReason(r)} style={[styles.chip, active && styles.chipOn]}>
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>{REPORT_REASON_LABELS[r]}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            maxLength={LIMITS.maxReportDetails}
            multiline
            placeholder="Add details (optional)"
            placeholderTextColor="#7894a5"
            style={styles.textarea}
            accessibilityLabel="Details"
          />

          <View style={styles.row}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={onBlock} style={[styles.btn, styles.btnLight, { flex: 1 }, busy && { opacity: 0.6 }]}>
              <Icon name="block" size={17} color={colors.secondaryInk} />
              <Text style={[styles.btnText, { color: colors.secondaryInk }]}>Block</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || reason === null}
              onPress={() => reason && onReport(reason, details)}
              style={[styles.btn, styles.btnDanger, { flex: 1.6 }, (busy || reason === null) && { opacity: 0.6 }]}
            >
              <Icon name="flag" size={17} />
              <Text style={[styles.btnText, { color: '#fff' }]}>Report &amp; next</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#092b42b0' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: colors.ink, fontSize: 17, fontFamily: font.bold },
  sub: { color: colors.muted, fontSize: 12, lineHeight: 18, fontFamily: font.regular, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: '#c8e3eb', backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.surfaceInk, fontSize: 12, fontFamily: font.semi },
  textarea: { minHeight: 74, borderRadius: 14, borderWidth: 1, borderColor: '#c8e3eb', backgroundColor: '#fff', color: colors.surfaceInk, padding: 12, fontSize: 12, fontFamily: font.regular, textAlignVertical: 'top', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { height: 45, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnLight: { backgroundColor: colors.secondary },
  btnDanger: { backgroundColor: '#b3283f' },
  btnText: { fontSize: 12, fontFamily: font.extra },
});
