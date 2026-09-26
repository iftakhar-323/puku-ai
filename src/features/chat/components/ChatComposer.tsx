import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MicIcon,
  PlusIcon,
  SendIcon,
  SoundWaveIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { ChatModelChip } from './ChatModelChip';

interface ChatComposerProps {
  theme: ThemeColors;
  inputVal: string;
  onChangeText: (text: string) => void;
  selectedModelLabel: string;
  isSending?: boolean;
  onFocus?: () => void;
  onPlusTap: () => void;
  onModelTap: () => void;
  onSubmitTap: () => void;
  onVoiceConversationTap: () => void;
  onMicrophoneTap?: () => void;
}

export function ChatComposer({
  theme,
  inputVal,
  onChangeText,
  selectedModelLabel,
  isSending = false,
  onFocus,
  onPlusTap,
  onModelTap,
  onSubmitTap,
  onVoiceConversationTap,
  onMicrophoneTap,
}: ChatComposerProps) {
  const canSubmit = inputVal.trim().length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.chatBarBackground,
          borderColor: theme.outline,
        },
      ]}>
      {/* Top Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          value={inputVal}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder="Chat with Puku..."
          placeholderTextColor={theme.placeholderText}
          multiline
          style={[styles.input, { color: theme.textPrimary }]}
        />
        {canSubmit && (
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={isSending}
            onPress={onSubmitTap}
            style={[styles.sendBtn, { backgroundColor: theme.primaryLight }]}>
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <SendIcon size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Actions Row */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPlusTap}
            style={styles.iconBtn}>
            <PlusIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <ChatModelChip
            label={selectedModelLabel}
            theme={theme}
            onTap={onModelTap}
          />
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onMicrophoneTap}
            style={styles.iconBtn}>
            <MicIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onVoiceConversationTap}
            style={styles.iconBtn}>
            <SoundWaveIcon size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 0,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 4,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
