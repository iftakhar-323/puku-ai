import React, { useState } from 'react';
import {
  ActivityIndicator,
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
  MicIcon,
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
}: ChatComposerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const canSubmit = inputVal.trim().length > 0;

  const currentModelObj =
    AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <View style={styles.outerWrapper}>
      {/* 1:1 Model Selection Floating Dropdown (Screenshot 2) */}
      {dropdownOpen && (
        <View style={[styles.dropdownPopup, { backgroundColor: '#181A17', borderColor: '#2E322C' }]}>
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
                  {isSelected && <CheckmarkIcon size={14} color="#E4E8E2" />}
                </View>
                <Text
                  style={[
                    styles.modelNameText,
                    { color: isSelected ? '#FFFFFF' : '#C7CBC5', fontFamily: monoFont },
                  ]}>
                  {modelItem.label}
                </Text>
                <Text style={[styles.modelBadgeText, { color: '#71767B', fontFamily: monoFont }]}>
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
            backgroundColor: '#151714',
            borderColor: '#262925',
          },
        ]}>
        {/* Top Multiline Input */}
        <TextInput
          value={inputVal}
          onChangeText={onChangeText}
          onFocus={() => {
            setDropdownOpen(false);
            onFocus?.();
          }}
          placeholder="A question, a thought, a wild idea..."
          placeholderTextColor="#71767B"
          multiline
          style={[
            styles.input,
            {
              color: '#ECEEEC',
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
              style={styles.actionIconBtn}>
              <PlusIcon size={18} color="#8E9297" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDropdownOpen(prev => !prev)}
              style={styles.modelPillBtn}>
              <Text style={[styles.modelPillLabel, { color: '#8E9297', fontFamily: monoFont }]}>
                {currentModelObj.label}
              </Text>
              <ChevronDownIcon size={12} color="#8E9297" />
            </TouchableOpacity>
          </View>

          {/* Right Group: Mic and Send ([↑]) */}
          <View style={styles.rightGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onMicrophoneTap}
              style={[
                styles.actionIconBtn,
                isListening && { backgroundColor: 'rgba(255, 77, 79, 0.2)', borderRadius: 16 },
              ]}>
              <MicIcon size={18} color={isListening ? '#FF4D4F' : '#8E9297'} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={isSending || !canSubmit}
              onPress={() => {
                setDropdownOpen(false);
                onSubmitTap();
              }}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: canSubmit ? '#363C34' : '#222521',
                },
              ]}>
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <UpArrowIcon size={16} color={canSubmit ? '#FFFFFF' : '#656A64'} />
              )}
            </TouchableOpacity>
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
    letterSpacing: 0.2,
  },
  modelBadgeText: {
    fontSize: 13,
  },
  container: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  input: {
    minHeight: 46,
    maxHeight: 120,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 2,
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
    gap: 10,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  modelPillLabel: {
    fontSize: 13,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
