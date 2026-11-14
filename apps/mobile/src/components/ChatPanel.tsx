import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LIMITS } from '@vybe/shared';
import type { ChatLine } from '@vybe/client-core';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { colors, font } from '../theme';

interface ChatPanelProps {
  open: boolean;
  messages: ChatLine[];
  onClose: () => void;
  onSend: (text: string) => void;
}

export function ChatPanel({ open, messages, onClose, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    if (open) scroller.current?.scrollToEnd({ animated: true });
  }, [messages, open]);

  if (!open) return null;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <LinearGradient colors={['transparent', 'rgba(8,43,67,0.8)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.55 }} style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>Chat</Text>
        <IconButton name="close" label="Close chat" size={34} onPress={onClose} />
      </View>
      <ScrollView ref={scroller} style={styles.list} contentContainerStyle={{ gap: 7, paddingBottom: 10 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && (
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Say hello to start the conversation.</Text>
          </View>
        )}
        {messages.map((line) => (
          <View key={line.id} style={[styles.bubble, line.mine && styles.mine]}>
            <Text style={styles.bubbleText}>{line.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.compose}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          maxLength={LIMITS.maxMessageLength}
          placeholder="Type a message"
          placeholderTextColor="#7894a5"
          returnKeyType="send"
          style={styles.input}
          accessibilityLabel="Message"
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={submit} style={styles.send}>
          <Icon name="send" size={17} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  panel: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 13, borderRadius: 25 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  title: { color: '#fff', fontSize: 13, fontFamily: font.bold },
  list: { maxHeight: '55%' },
  bubble: { alignSelf: 'flex-start', maxWidth: '82%', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: '#f4fbff' },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.bubbleMine, borderBottomLeftRadius: 14, borderBottomRightRadius: 4 },
  bubbleText: { color: '#20465a', fontSize: 12, fontFamily: font.regular },
  compose: { flexDirection: 'row', gap: 7, padding: 8, borderRadius: 16, backgroundColor: '#f6fbff', alignItems: 'center' },
  input: { flex: 1, height: 37, color: colors.surfaceInk, fontSize: 12, fontFamily: font.regular, paddingHorizontal: 6 },
  send: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#0d4966', alignItems: 'center', justifyContent: 'center' },
});
