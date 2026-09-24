import React from 'react';
import { StyleSheet, View } from 'react-native';

export interface IconProps {
  size?: number;
  color?: string;
}

export function MenuIcon({ size = 24, color = '#322F48' }: IconProps) {
  const lineH = Math.max(2, size / 10);
  return (
    <View style={{ width: size, height: size * 0.75, justifyContent: 'space-between' }}>
      <View style={{ width: size, height: lineH, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ width: size * 0.75, height: lineH, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ width: size * 0.5, height: lineH, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

export function PlusIcon({ size = 20, color = '#4A2EC7' }: IconProps) {
  const thickness = Math.max(2, size / 8);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: thickness, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ position: 'absolute', width: thickness, height: size, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

export function CloseIcon({ size = 20, color = '#6B6882' }: IconProps) {
  const thickness = Math.max(2, size / 9);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 0.9, height: thickness, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.9, height: thickness, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

export function BackIcon({ size = 22, color = '#151324' }: IconProps) {
  const thickness = Math.max(2, size / 9);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.7, height: thickness, backgroundColor: color, borderRadius: 2, position: 'absolute', left: 2 }} />
      <View style={{ width: size * 0.45, height: thickness, backgroundColor: color, borderRadius: 2, position: 'absolute', left: 2, top: size * 0.28, transform: [{ rotate: '-45deg' }] }} />
      <View style={{ width: size * 0.45, height: thickness, backgroundColor: color, borderRadius: 2, position: 'absolute', left: 2, bottom: size * 0.28, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

export function MicIcon({ size = 20, color = '#4A2EC7' }: IconProps) {
  const bodyW = size * 0.4;
  const bodyH = size * 0.55;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: bodyW, height: bodyH, backgroundColor: color, borderRadius: bodyW / 2 }} />
      <View style={{ width: size * 0.75, height: size * 0.35, borderBottomLeftRadius: size * 0.4, borderBottomRightRadius: size * 0.4, borderWidth: 2, borderTopWidth: 0, borderColor: color, marginTop: -2 }} />
      <View style={{ width: 2, height: size * 0.2, backgroundColor: color }} />
      <View style={{ width: size * 0.4, height: 2, backgroundColor: color }} />
    </View>
  );
}

export function SendIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.7, height: 2.5, backgroundColor: color, borderRadius: 1.5, position: 'absolute' }} />
      <View style={{ width: size * 0.5, height: 2.5, backgroundColor: color, borderRadius: 1.5, position: 'absolute', right: size * 0.15, top: size * 0.25, transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: size * 0.5, height: 2.5, backgroundColor: color, borderRadius: 1.5, position: 'absolute', right: size * 0.15, bottom: size * 0.25, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

export function SearchIcon({ size = 20, color = '#7B7894' }: IconProps) {
  const circleSize = size * 0.65;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2, borderWidth: 2, borderColor: color, position: 'absolute', top: 1, left: 1 }} />
      <View style={{ width: size * 0.4, height: 2, backgroundColor: color, borderRadius: 1, position: 'absolute', bottom: 3, right: 1, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

export function DeleteIcon({ size = 20, color = '#FF4D4F' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.8, height: 2, backgroundColor: color, borderRadius: 1, position: 'absolute', top: size * 0.15 }} />
      <View style={{ width: size * 0.6, height: size * 0.65, borderWidth: 2, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, position: 'absolute', bottom: 2 }} />
      <View style={{ width: 1.5, height: size * 0.35, backgroundColor: color, position: 'absolute', bottom: 5, left: size * 0.38 }} />
      <View style={{ width: 1.5, height: size * 0.35, backgroundColor: color, position: 'absolute', bottom: 5, right: size * 0.38 }} />
    </View>
  );
}

export function ChatsIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.65, borderRadius: 6, borderWidth: 2, borderColor: color, position: 'absolute', top: 2 }} />
      <View style={{ width: size * 0.25, height: size * 0.25, backgroundColor: color, position: 'absolute', bottom: 2, left: size * 0.2, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

export function ProjectsIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.4, height: size * 0.25, backgroundColor: color, borderTopLeftRadius: 4, borderTopRightRadius: 4, position: 'absolute', top: 2, left: 2 }} />
      <View style={{ width: size * 0.9, height: size * 0.6, borderRadius: 5, borderWidth: 2, borderColor: color, position: 'absolute', bottom: 2 }} />
    </View>
  );
}

export function ArtifactsIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.75, height: size * 0.75, borderWidth: 2, borderColor: color, borderRadius: 4, position: 'absolute', top: 2, left: 2 }} />
      <View style={{ width: size * 0.45, height: size * 0.45, backgroundColor: color, borderRadius: 2, opacity: 0.6, position: 'absolute', bottom: 2, right: 2 }} />
    </View>
  );
}

export function CodeIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.35, height: 2, backgroundColor: color, transform: [{ rotate: '-45deg' }], position: 'absolute', left: 2, top: size * 0.32 }} />
      <View style={{ width: size * 0.35, height: 2, backgroundColor: color, transform: [{ rotate: '45deg' }], position: 'absolute', left: 2, bottom: size * 0.32 }} />
      <View style={{ width: size * 0.35, height: 2, backgroundColor: color, transform: [{ rotate: '45deg' }], position: 'absolute', right: 2, top: size * 0.32 }} />
      <View style={{ width: size * 0.35, height: 2, backgroundColor: color, transform: [{ rotate: '-45deg' }], position: 'absolute', right: 2, bottom: size * 0.32 }} />
      <View style={{ width: size * 0.5, height: 2, backgroundColor: color, transform: [{ rotate: '-70deg' }], position: 'absolute' }} />
    </View>
  );
}

export function RemoteIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.6, borderWidth: 2, borderColor: color, borderRadius: 4, position: 'absolute', top: 2 }} />
      <View style={{ width: size * 0.4, height: 2, backgroundColor: color, position: 'absolute', bottom: 2 }} />
      <View style={{ width: 2, height: size * 0.2, backgroundColor: color, position: 'absolute', bottom: 4 }} />
    </View>
  );
}

export function TranscribeIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 }}>
      <View style={{ width: 2, height: size * 0.4, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.8, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.5, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.9, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.3, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

export function LiveVoiceIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.85, borderRadius: size * 0.45, borderWidth: 2, borderColor: color, opacity: 0.4, position: 'absolute' }} />
      <View style={{ width: size * 0.55, height: size * 0.55, borderRadius: size * 0.3, borderWidth: 2, borderColor: color, opacity: 0.7, position: 'absolute' }} />
      <View style={{ width: size * 0.25, height: size * 0.25, borderRadius: size * 0.15, backgroundColor: color, position: 'absolute' }} />
    </View>
  );
}

export function SettingsIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.65, height: size * 0.65, borderRadius: size * 0.35, borderWidth: 2.5, borderColor: color }} />
      <View style={{ width: size * 0.9, height: 2, backgroundColor: color, position: 'absolute' }} />
      <View style={{ width: 2, height: size * 0.9, backgroundColor: color, position: 'absolute' }} />
    </View>
  );
}

export function ProfileIcon({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, borderWidth: 2, borderColor: color, position: 'absolute', top: 2 }} />
      <View style={{ width: size * 0.75, height: size * 0.45, borderTopLeftRadius: size * 0.35, borderTopRightRadius: size * 0.35, borderWidth: 2, borderBottomWidth: 0, borderColor: color, position: 'absolute', bottom: 2 }} />
    </View>
  );
}

export function CopyIcon({ size = 18, color = '#87868E' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.65, borderWidth: 1.5, borderColor: color, borderRadius: 3, position: 'absolute', top: 1, left: 1 }} />
      <View style={{ width: size * 0.6, height: size * 0.65, borderWidth: 1.5, borderColor: color, backgroundColor: 'transparent', borderRadius: 3, position: 'absolute', bottom: 1, right: 1 }} />
    </View>
  );
}

export function CheckmarkIcon({ size = 18, color = '#52C41A' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.3, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '45deg' }], position: 'absolute', bottom: size * 0.35, left: size * 0.2 }} />
      <View style={{ width: size * 0.6, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }], position: 'absolute', bottom: size * 0.45, right: size * 0.15 }} />
    </View>
  );
}

export function IncognitoIcon({ size = 20, color = '#A5A5FF' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.8, height: size * 0.25, backgroundColor: color, borderRadius: 2, position: 'absolute', top: 3 }} />
      <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, borderWidth: 2, borderColor: color, position: 'absolute', bottom: 2, left: 2 }} />
      <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, borderWidth: 2, borderColor: color, position: 'absolute', bottom: 2, right: 2 }} />
      <View style={{ width: size * 0.2, height: 2, backgroundColor: color, position: 'absolute', bottom: size * 0.2 }} />
    </View>
  );
}

export function PukuLogoBadge({ size = 62, bg = '#6C47EB' }: { size?: number; bg?: string }) {
  const stemW = size * (7 / 62);
  const loopW = size * (24 / 62);
  const loopH = size * (20 / 62);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * (18 / 62),
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: bg,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
      }}>
      <View style={{ width: size * (28 / 62), height: size * (32 / 62), position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: stemW,
            backgroundColor: '#FFFFFF',
            borderRadius: stemW / 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * (4 / 62),
            top: 0,
            width: loopW,
            height: loopH,
            borderWidth: size * (6 / 62),
            borderColor: '#FFFFFF',
            borderTopRightRadius: size * (10 / 62),
            borderBottomRightRadius: size * (10 / 62),
            borderTopLeftRadius: size * (3 / 62),
            borderBottomLeftRadius: size * (3 / 62),
            backgroundColor: bg,
          }}
        />
      </View>
    </View>
  );
}
