import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ChatEngine, SupabaseTransport, type EngineState, type PeerLike } from '@vybe/client-core';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/env';

export type WebEngine = ChatEngine<MediaStream>;

/** ওয়েবের জন্য ChatEngine: Supabase ব্যাকএন্ড + ব্রাউজারের RTCPeerConnection */
export function createWebEngine(): WebEngine {
  return new ChatEngine<MediaStream>({
    transport: new SupabaseTransport({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }),
    createPeer: (iceServers) =>
      new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' }) as unknown as PeerLike<MediaStream>,
  });
}

export function useChatEngine(): { engine: WebEngine; state: EngineState<MediaStream> } {
  const engine = useMemo(createWebEngine, []);
  useEffect(() => {
    engine.connect();
    return () => engine.dispose();
  }, [engine]);
  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  return { engine, state };
}
