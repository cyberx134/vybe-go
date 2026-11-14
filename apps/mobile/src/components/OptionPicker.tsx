import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, font } from '../theme';

interface OptionPickerProps {
  visible: boolean;
  title: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function OptionPicker({ visible, title, options, selected, onSelect, onClose }: OptionPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const active = item === selected;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={[styles.rowText, active && { color: '#fff' }]}>{item}</Text>
                  {active && <Icon name="check" size={18} color="#fff" />}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#092b42b0' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
  title: { color: colors.ink, fontSize: 16, fontFamily: font.bold, marginBottom: 10 },
  row: { height: 46, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowActive: { backgroundColor: colors.primary },
  rowText: { color: colors.surfaceInk, fontSize: 14, fontFamily: font.semi },
});
