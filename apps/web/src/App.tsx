import { useCallback, useState } from 'react';
import { AgeGate } from './components/AgeGate';
import { SetupScreen } from './components/SetupScreen';
import { isConfigured } from './lib/env';
import { clearProfile, loadProfile, saveProfile, type Profile } from './lib/storage';
import { ChatScreen } from './screens/ChatScreen';

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);

  const accept = useCallback((next: Profile) => {
    saveProfile(next);
    setProfile(next);
  }, []);

  const edit = useCallback(() => {
    clearProfile();
    setProfile(null);
  }, []);

  if (!isConfigured) return <SetupScreen />;
  if (!profile) return <AgeGate onAccept={accept} />;
  return <ChatScreen profile={profile} onEditProfile={edit} />;
}
