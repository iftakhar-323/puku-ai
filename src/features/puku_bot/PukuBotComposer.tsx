import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { PukuBotSkill } from '../../types';
import {
  PaperclipIcon,
  SparkleIcon,
  UpArrowIcon,
  CloseIcon,
} from '../../components/common/Icons';
import { styles } from './pukuBotStyles';

function StopSquareIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="5" width="14" height="14" rx="2" fill={color} />
    </Svg>
  );
}

export interface PukuBotComposerProps {
  theme: any;
  isDark: boolean;
  monoFont: string;
  inputRef: React.RefObject<any>;
  inputVal: string;
  setInputVal: (val: string) => void;
  isDeviceOnline: boolean;
  isStreaming: boolean;
  pendingAttachment: { uri: string; name: string; type: string; size?: number } | null;
  setPendingAttachment: (att: any) => void;
  filteredBotSkills: PukuBotSkill[];
  showSkillsMenu: boolean;
  setShowSkillsMenu: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenPicker: () => void;
  onStopStream: () => void;
  onSend: () => void;
}

export const PukuBotComposer: React.FC<PukuBotComposerProps> = ({
  theme,
  isDark,
  monoFont,
  inputRef,
  inputVal,
  setInputVal,
  isDeviceOnline,
  isStreaming,
  pendingAttachment,
  setPendingAttachment,
  filteredBotSkills,
  showSkillsMenu,
  setShowSkillsMenu,
  onOpenPicker,
  onStopStream,
  onSend,
}) => {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.composerCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setPendingAttachment(null)}
            style={styles.removeAttBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <CloseIcon size={14} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* / Skills Autocomplete Menu */}
      {filteredBotSkills.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
          contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          {filteredBotSkills.map(skill => (
            <TouchableOpacity
              key={skill.slug}
              activeOpacity={0.7}
              onPress={() => {
                setInputVal(`/${skill.slug} `);
                setShowSkillsMenu(false);
                inputRef.current?.focus();
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: isDark ? '#232924' : '#EAECE6',
                borderWidth: 1,
                borderColor: theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#35D6B4', fontFamily: monoFont }}>
                /{skill.slug}
              </Text>
              <Text style={{ fontSize: 10.5, color: theme.textMuted, fontFamily: monoFont }}>
                {skill.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TextInput
        ref={inputRef as any}
        value={inputVal}
        onChangeText={setInputVal}
        placeholder={!isDeviceOnline ? "You're offline" : t('pukuBot.composerPlaceholder')}
        placeholderTextColor={theme.placeholderText}
        multiline
        editable={isDeviceOnline}
        style={[
          styles.composerInput,
          {
            color: isDeviceOnline ? theme.textPrimary : theme.textMuted,
            fontFamily: monoFont,
          },
        ]}
      />

      <View style={styles.composerBottomRow}>
        <View style={styles.composerLeftMeta}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Attach file"
            activeOpacity={0.7}
            onPress={onOpenPicker}
            style={[styles.composerIconBtn, { borderColor: theme.border }]}>
            <PaperclipIcon size={17} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Skills menu"
            activeOpacity={0.7}
            onPress={() => setShowSkillsMenu(prev => !prev)}
            style={[
              styles.composerIconBtn,
              {
                marginLeft: 8,
                borderColor: showSkillsMenu ? '#35D6B4' : theme.border,
                backgroundColor: showSkillsMenu ? (isDark ? '#1C271E' : '#E0F3E5') : 'transparent',
              },
            ]}>
            <SparkleIcon size={16} color={showSkillsMenu ? '#35D6B4' : theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {isStreaming ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Stop"
            activeOpacity={0.7}
            onPress={onStopStream}
            style={[styles.sendBtn, { backgroundColor: '#FF4D4F' }]}>
            <StopSquareIcon size={14} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send"
            activeOpacity={0.7}
            disabled={!isDeviceOnline || (!inputVal.trim() && !pendingAttachment)}
            onPress={onSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor: (isDeviceOnline && (inputVal.trim() || pendingAttachment))
                  ? (isDark ? '#E4E8E2' : '#1A1D18')
                  : (isDark ? '#262925' : '#E4E5DB'),
              },
            ]}>
            <UpArrowIcon
              size={18}
              color={(inputVal.trim() || pendingAttachment) ? (isDark ? '#141613' : '#FFFFFF') : theme.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
