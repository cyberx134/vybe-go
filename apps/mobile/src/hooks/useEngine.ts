import { useEffect, useMemo, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatEngine, SupabaseTransport, type EngineState, type PeerLike } from '@vybe/client-core';
import { RTCPeerConnection, type MediaStream } from 'react-native-webrtc';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/config';

export type MobileEngine = ChatEngine<MediaStream>;

/** মোবাইলের জন্য ChatEngine: Supabase ব্যাকএন্ড (সেশন AsyncStorage এ) + react-native-webrtc */
export function useEngine(): { engine: MobileEngine; state: EngineState<MediaStream> } {
  const engine = useMemo(
    () =>
      new ChatEngine<MediaStream>({
        transport: new SupabaseTransport({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, storage: AsyncStorage }),
        createPeer: (iceServers) => new RTCPeerConnection({ iceServers }) as unknown as PeerLike<MediaStream>,
      }),
    [],
  );

  useEffect(() => {
    engine.connect();
    return () => engine.dispose();
  }, [engine]);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  return { engine, state };
}
