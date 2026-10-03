import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, CloseIcon, PaperclipIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { NativePicker, PickedMedia } from '../../../services/nativeModules';
import { MediaPickerModal } from '../../../components/common/MediaPickerModal';
import { OptionSheet } from './OptionSheet';
import {
  isValidAttachment,
  PERMISSION_MODES,
  PermissionMode,
  REMOTE_MODELS,
  RemoteAttachment,
} from '../relay/protocol';

interface Props {
  theme: ThemeColors;
  enabled: boolean;
  disabledHint: string;
  isWorking: boolean;
  permissionMode: PermissionMode;
  model?: string;
  onSend: (text: string, attachment?: RemoteAttachment) => boolean;
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
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState<'mode' | 'model' | null>(null);
  const [attachment, setAttachment] = useState<PickedMedia | null>(null);
  const [showPickerSheet, setShowPickerSheet] = useState(false);

  const hasText = text.trim().length > 0;
  const hasAttachment = !!attachment;
  const canSubmit = (hasText || hasAttachment) && enabled;
  const showStop = isWorking && !hasText && !hasAttachment;
  const modeLabel =
    PERMISSION_MODES.find(m => m.mode === permissionMode)?.label ||
    t('remoteSession.askModeFallback');
  const models =
    model && !REMOTE_MODELS.includes(model)
      ? [model, ...REMOTE_MODELS]
      : REMOTE_MODELS;

  const handleAttach = () => {
    setShowPickerSheet(true);
  };

  const handleTakePhoto = async () => {
    try {
      const media = await NativePicker.takePhoto();
      if (!media) return;
      if (!isValidAttachment(media)) {
        Alert.alert(
          t('remoteSession.unsupportedAttachmentTitle'),
          t('remoteSession.unsupportedAttachmentMessage'),
        );
        return;
      }
      setAttachment(media);
    } catch (err: any) {
      Alert.alert(
        t('remoteSession.cameraErrorTitle'),
        err?.message || t('remoteSession.couldNotTakePhoto'),
      );
    }
  };

  const handlePickMedia = async () => {
    try {
      const media = await NativePicker.pickMedia();
      if (!media) return;
      if (!isValidAttachment(media)) {
        Alert.alert(
          t('remoteSession.unsupportedAttachmentTitle'),
          t('remoteSession.unsupportedAttachmentMessage'),
        );
        return;
      }
      setAttachment(media);
    } catch (err: any) {
      Alert.alert(
        t('remoteSession.fileErrorTitle'),
        err?.message || t('remoteSession.couldNotPickFile'),
      );
    }
  };

  const submit = () => {
    if (!canSubmit) return;
    const sent = onSend(
      text,
      attachment && attachment.base64
        ? {
            uri: attachment.uri,
            base64: attachment.base64,
            mediaType: attachment.type,
          }
        : undefined,
    );
    if (sent) {
      setText('');
      setAttachment(null);
    }
  };

  return (
    <View style={styles.container}>
      {attachment ? (
        <View style={styles.attachmentRow}>
          <View style={styles.attachmentThumbWrap}>
            <Image
              source={{ uri: attachment.uri }}
              style={styles.attachmentThumb}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Remove attachment"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setAttachment(null)}
              style={[
                styles.attachmentRemove,
                { backgroundColor: theme.cardBackground },
              ]}
            >
              <CloseIcon size={11} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.chatBarBackground,
            borderColor: theme.chatBarBorder,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={!enabled}
          accessibilityRole="button"
          accessibilityLabel="Attach image"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={handleAttach}
          style={[styles.attachBtn, !enabled && styles.dimmed]}
        >
          <PaperclipIcon size={18} color={theme.textMuted} />
        </TouchableOpacity>
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
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={submit}
            style={styles.sendBtn}
          >
            <Text
              style={[
                styles.sendGlyph,
                {
                  color: canSubmit ? theme.textPrimary : theme.textMuted,
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
            {model || t('remoteSession.defaultModel')}
          </Text>
          <ChevronDownIcon size={11} color={theme.textMuted} />
        </TouchableOpacity>
        {isWorking && (
          <ActivityIndicator size="small" color={theme.textMuted} />
        )}
      </View>

      <OptionSheet
        visible={sheet === 'mode'}
        title={t('remoteSession.permissionModeTitle')}
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
        title={t('remoteSession.modelTitle')}
        theme={theme}
        selectedKey={model}
        options={models.map(m => ({ key: m, label: m }))}
        onSelect={key => {
          setSheet(null);
          if (key !== model) onSetModel(key);
        }}
        onClose={() => setSheet(null)}
      />
      <MediaPickerModal
        visible={showPickerSheet}
        theme={theme}
        title={t('remoteSession.attachImageTitle')}
        onClose={() => setShowPickerSheet(false)}
        onTakePhoto={handleTakePhoto}
        onPickMedia={handlePickMedia}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 18,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  attachBtn: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  attachmentRow: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  attachmentThumbWrap: {
    width: 56,
    height: 56,
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  attachmentRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 2,
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
