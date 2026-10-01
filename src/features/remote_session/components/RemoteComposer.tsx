import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDownIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { OptionSheet } from './OptionSheet';
import {
  PERMISSION_MODES,
  PermissionMode,
  REMOTE_MODELS,
} from '../relay/protocol';

interface Props {
  theme: ThemeColors;
  enabled: boolean;
  disabledHint: string;
  isWorking: boolean;
  permissionMode: PermissionMode;
  model?: string;
  onSend: (text: string) => boolean;
  onInterrupt: () => void;
  onSetPermissionMode: (mode: PermissionMode) => void;
  onSetModel: (model: string) => void;
}

/** Claude Code-style composer: input with ↵, then mode · model · spinner. */
export function RemoteComposer({
  theme,
  enabled,
  disabledHint,
  isWorking,
  permissionMode,
  model,
  onSend,
  onInterrupt,
  onSetPermissionMode,
  onSetModel,
}: Props) {
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState<'mode' | 'model' | null>(null);

  const hasText = text.trim().length > 0;
  const showStop = isWorking && !hasText;
  const modeLabel =
    PERMISSION_MODES.find(m => m.mode === permissionMode)?.label || 'Ask';
  const models =
    model && !REMOTE_MODELS.includes(model)
      ? [model, ...REMOTE_MODELS]
      : REMOTE_MODELS;

  const submit = () => {
    if (!hasText || !enabled) return;
    if (onSend(text)) setText('');
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.chatBarBackground,
            borderColor: theme.chatBarBorder,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder={enabled ? 'Type / for commands' : disabledHint}
          placeholderTextColor={theme.placeholderText}
          value={text}
          onChangeText={setText}
          editable={enabled}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Message to your laptop"
        />
        {showStop ? (
          <TouchableOpacity
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Stop (interrupt the laptop)"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onInterrupt}
            style={styles.sendBtn}
          >
            <View
              style={[
                styles.stopSquare,
                { backgroundColor: theme.textPrimary },
              ]}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !hasText || !enabled }}
            disabled={!hasText || !enabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={submit}
            style={styles.sendBtn}
          >
            <Text
              style={[
                styles.sendGlyph,
                {
                  color:
                    hasText && enabled ? theme.textPrimary : theme.textMuted,
                },
              ]}
            >
              ↵
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={!enabled}
          accessibilityRole="button"
          accessibilityLabel={`Permission mode: ${modeLabel}`}
          onPress={() => setSheet('mode')}
          style={[styles.control, !enabled && styles.dimmed]}
        >
          <Text style={[styles.controlText, { color: theme.textSecondary }]}>
            {modeLabel}
          </Text>
          <ChevronDownIcon size={11} color={theme.textMuted} />
        </TouchableOpacity>
        <View style={styles.spacer} />
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={!enabled}
          accessibilityRole="button"
          accessibilityLabel={`Model: ${model || 'default'}`}
          onPress={() => setSheet('model')}
          style={[styles.control, !enabled && styles.dimmed]}
        >
          <Text
            numberOfLines={1}
            style={[styles.controlText, { color: theme.textSecondary }]}
          >
            {model || 'Default model'}
          </Text>
          <ChevronDownIcon size={11} color={theme.textMuted} />
        </TouchableOpacity>
        {isWorking && (
          <ActivityIndicator size="small" color={theme.textMuted} />
        )}
      </View>

      <OptionSheet
        visible={sheet === 'mode'}
        title="Permission mode"
        theme={theme}
        selectedKey={permissionMode}
        options={PERMISSION_MODES.map(m => ({
          key: m.mode,
          label: m.label,
          description: m.description,
        }))}
        onSelect={key => {
          setSheet(null);
          if (key !== permissionMode)
            onSetPermissionMode(key as PermissionMode);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'model'}
        title="Model"
        theme={theme}
        selectedKey={model}
        options={models.map(m => ({ key: m, label: m }))}
        onSelect={key => {
          setSheet(null);
          if (key !== model) onSetModel(key);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 110,
    minHeight: 24,
    paddingVertical: 2,
  },
  sendBtn: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  stopSquare: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 170,
  },
  controlText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dimmed: {
    opacity: 0.5,
  },
  spacer: {
    flex: 1,
  },
});
