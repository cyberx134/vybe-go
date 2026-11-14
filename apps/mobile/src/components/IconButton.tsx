import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IconName } from '@vybe/shared';
import { Icon } from './Icon';
import { font } from '../theme';

interface IconButtonProps {
  name: IconName;
  label: string;
  onPress: () => void;
  pressed?: boolean;
  danger?: boolean;
  badge?: number;
  size?: number;
}

export function IconButton({ name, label, onPress, pressed, danger, badge, size = 42 }: IconButtonProps) {
  const iconColor = pressed ? '#ffffff' : danger ? '#b3283f' : '#214b61';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: pressed }}
      onPress={onPress}
      style={({ pressed: down }) => [
        styles.btn,
        { width: size, height: size },
        pressed && styles.on,
        down && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <Icon name={name} size={size > 38 ? 19 : 16} color={iconColor} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 15,
    backgroundColor: '#ffffffd9',
    borderWidth: 1,
    borderColor: '#ffffff70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: '#092f49' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#e5546b',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: font.bold },
});
