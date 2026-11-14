import { colors } from '@vybe/shared';

export { colors };

/** @expo-google-fonts/inter থেকে লোড হওয়া ফন্ট নাম (ডেমোর Inter) */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extra: 'Inter_800ExtraBold',
} as const;

export const gradients = {
  background: [colors.bgTop, colors.bgMid, colors.bgBottom] as const,
  opponent: ['#76a9c4', '#2a6d91', '#174a6c'] as const,
  self: ['#d7edf3', '#9cc8d8', '#6099b5'] as const,
};

export const radius = { card: 25, control: 22, choice: 14, action: 15, pill: 30 } as const;
