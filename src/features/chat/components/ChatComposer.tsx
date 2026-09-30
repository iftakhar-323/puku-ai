import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  CheckmarkIcon,
  ChevronDownIcon,
  CloseIcon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  UpArrowIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { ChatModelType } from '../../../types';

interface ChatComposerProps {
  theme: ThemeColors;
  inputVal: string;
  onChangeText: (text: string) => void;
  selectedModel: ChatModelType;
  onSelectModel: (model: ChatModelType) => void;
  isSending?: boolean;
  isListening?: boolean;
  onFocus?: () => void;
  onPlusTap: () => void;
  onSubmitTap: () => void;
  onMicrophoneTap?: () => void;
  inputRef?: any;
  pendingAttachment?: { uri: string; name: string; type: string; size?: number } | null;
  onRemoveAttachment?: () => void;
}

const AVAILABLE_MODELS: { id: ChatModelType; label: string; badge: string }[] = [
  { id: 'puku-ai-2.8', label: 'Puku-ai 2.8', badge: 'Fast' },
  { id: 'puku-ai-2.7', label: 'Puku-ai 2.7', badge: 'Fast' },
  { id: 'opus-4.8', label: 'Opus 4.8', badge: 'High' },
];

export function ChatComposer({
  theme,
  inputVal,
  onChangeText,
  selectedModel,
  onSelectModel,
  isSending = false,
  isListening = false,
  onFocus,
  onPlusTap,
  onSubmitTap,
  onMicrophoneTap,
  inputRef,
  pendingAttachment,
  onRemoveAttachment,
}: ChatComposerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const canSubmit = inputVal.trim().length > 0 || !!pendingAttachment;

  const currentModelObj =
    AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  return (
    <View style={styles.outerWrapper}>
      {/* 1:1 Model Selection Floating Dropdown */}
      {dropdownOpen && (
        <View
          style={[
            styles.dropdownPopup,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          {AVAILABLE_MODELS.map(modelItem => {
            const isSelected = selectedModel === modelItem.id;
            return (
              <TouchableOpacity
                key={modelItem.id}
                activeOpacity={0.7}
                onPress={() => {
                  onSelectModel(modelItem.id);
                  setDropdownOpen(false);
                }}
                style={styles.dropdownRow}>
                <View style={styles.checkCol}>
                  {isSelected && <CheckmarkIcon size={14} color={theme.textPrimary} />}
                </View>
                <Text
                  style={[
                    styles.modelNameText,
                    {
                      color: isSelected ? theme.textPrimary : theme.textSecondary,
                      fontWeight: isSelected ? '600' : '400',
                      fontFamily: monoFont,
                    },
                  ]}>
                  {modelItem.label}
                </Text>
                <Text
                  style={[
                    styles.modelBadgeText,
                    { color: theme.textSecondary, fontFamily: monoFont },
                  ]}>
                  {modelItem.badge}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Main Composer Box */}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.cardBackground,
            borderColor: isFocused ? theme.primaryLight : theme.border,
            borderWidth: isFocused ? 1.5 : 1,
          },
        ]}>
        {/* Pending Attachment Preview (Any File / Photo) */}
        {pendingAttachment && (
          <View style={[styles.attachmentPreviewWrap, { backgroundColor: theme.pillBackground, borderColor: theme.border }]}>
            {pendingAttachment.type.startsWith('image/') ? (
              <Image source={{ uri: pendingAttachment.uri }} style={styles.attachmentThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.docIconWrap, { backgroundColor: theme.secondaryBackground }]}>
                <PaperclipIcon size={16} color={theme.textPrimary} />
              </View>
            )}
            <View style={styles.attachmentInfoWrap}>
              <Text numberOfLines={1} style={[styles.attachmentName, { color: theme.textPrimary, fontFamily: monoFont }]}>
                {pendingAttachment.name}
              </Text>
              {pendingAttachment.size ? (
                <Text style={[styles.attachmentSize, { color: theme.textMuted, fontFamily: monoFont }]}>
                  {Math.round(pendingAttachment.size / 1024)} KB
                </Text>
              ) : null}
            </View>
            {onRemoveAttachment && (
              <TouchableOpacity onPress={onRemoveAttachment} style={styles.removeAttBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CloseIcon size={14} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Top Multiline Input */}
        <TextInput
          ref={inputRef}
          value={inputVal}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            setDropdownOpen(false);
            onFocus?.();
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Write a message..."
          placeholderTextColor={theme.placeholderText}
          multiline
          style={[
            styles.input,
            {
              color: theme.textPrimary,
              fontFamily: monoFont,
            },
          ]}
        />

        {/* Bottom Actions Row */}
        <View style={styles.bottomControls}>
          {/* Left Group: Plus (+) and Model selector */}
          <View style={styles.leftGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDropdownOpen(false);
                onPlusTap();
              }}
              style={[
                styles.plusBtn,
                {
                  borderColor: theme.border,
                },
              ]}>
              <PlusIcon size={15} color={theme.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDropdownOpen(prev => !prev)}
              style={[
                styles.modelPillBtn,
                {
                  borderColor: theme.border,
                },
              ]}>
              <Text style={[styles.modelPillLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
                {currentModelObj.label}
              </Text>
              <ChevronDownIcon size={12} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Right Group: Status Dot, Mic, and Send / Stop */}
          <View style={styles.rightGroup}>
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onMicrophoneTap}
              style={[
                styles.actionIconBtn,
                isListening && { backgroundColor: 'rgba(255, 77, 79, 0.2)', borderRadius: 16 },
              ]}>
              <MicIcon size={18} color={isListening ? '#FF4D4F' : theme.textPrimary} />
            </TouchableOpacity>

            {isSending ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setDropdownOpen(false);
                  onSubmitTap();
                }}
                style={[styles.stopBtn, { backgroundColor: theme.error }]}>
                <View style={styles.stopSquare} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!canSubmit}
                onPress={() => {
                  setDropdownOpen(false);
                  onSubmitTap();
                }}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: canSubmit ? 1 : 0.28,
                  },
                ]}>
                <UpArrowIcon size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dropdownPopup: {
    position: 'absolute',
    bottom: 104,
    left: 8,
    width: 240,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 9999,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  checkCol: {
    width: 22,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  modelNameText: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  modelBadgeText: {
    fontSize: 12,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    minHeight: 48,
    maxHeight: 140,
    fontSize: 15.5,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  modelPillLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  attachmentPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  attachmentThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfoWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentName: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 10.5,
    marginTop: 2,
  },
  removeAttBtn: {
    padding: 4,
  },
});
