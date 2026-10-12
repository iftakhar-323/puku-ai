import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { RETRO_PUKU_COMPUTER_SOURCE } from '../../assets/images/retroComputerData';

interface Props {
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

export function RetroComputerIllustration({
  style = { width: 120, height: 112 },
  resizeMode = 'contain',
}: Props) {
  return (
    <Image
      source={RETRO_PUKU_COMPUTER_SOURCE}
      style={style}
      resizeMode={resizeMode}
    />
  );
}
