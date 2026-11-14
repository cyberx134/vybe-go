import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { GateScreen } from './src/screens/GateScreen';
import { MainScreen } from './src/screens/MainScreen';
import { isConfigured } from './src/lib/config';
import { clearProfile, loadFilters, loadProfile, saveProfile, type Profile, type SavedFilters } from './src/lib/storage';
import { colors, font, gradients } from './src/theme';

interface Bootstrap {
  profile: Profile | null;
  filters: SavedFilters;
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [boot, setBoot] = useState<Bootstrap | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadProfile(), loadFilters()]).then(([profile, filters]) => {
      if (!cancelled) setBoot({ profile, filters });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const accept = useCallback((profile: Profile) => {
    void saveProfile(profile);
    setBoot((b) => (b ? { ...b, profile } : b));
  }, []);

  const edit = useCallback(() => {
    void clearProfile();
    setBoot((b) => (b ? { ...b, profile: null } : b));
  }, []);

  if (!fontsLoaded || !boot) {
    return (
      <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      </LinearGradient>
    );
  }

  if (!isConfigured) {
    return (
      <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
        <View style={styles.center}>
          <Text style={styles.setupTitle}>Supabase is not configured</Text>
          <Text style={styles.setupText}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (apps/mobile/.env), then rebuild the app. See README.md.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {boot.profile ? <MainScreen profile={boot.profile} initialFilters={boot.filters} onEditProfile={edit} /> : <GateScreen onAccept={accept} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  setupTitle: { color: colors.white, fontSize: 18, fontFamily: font.bold, textAlign: 'center' },
  setupText: { color: '#d4edf5', fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: font.regular },
});
