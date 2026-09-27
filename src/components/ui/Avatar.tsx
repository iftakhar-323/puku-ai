import React, { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface AvatarProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

interface AvatarContextType {
  size: number;
  hasError: boolean;
  setHasError: (val: boolean) => void;
  hasLoaded: boolean;
  setHasLoaded: (val: boolean) => void;
}

const AvatarContext = React.createContext<AvatarContextType>({
  size: 36,
  hasError: false,
  setHasError: () => {},
  hasLoaded: false,
  setHasLoaded: () => {},
});

export function Avatar({ size = 36, style, children }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <AvatarContext.Provider
      value={{ size, hasError, setHasError, hasLoaded, setHasLoaded }}>
      <View
        style={[
          styles.root,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.pillBackground,
          },
          style,
        ]}>
        {children}
      </View>
    </AvatarContext.Provider>
  );
}

export function AvatarImage({
  source,
  style,
}: {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}) {
  const { size, hasError, setHasError, setHasLoaded } = React.useContext(AvatarContext);

  if (hasError) return null;

  return (
    <Image
      source={source}
      onLoad={() => setHasLoaded(true)}
      onError={() => setHasError(true)}
      style={[
        styles.image,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style as any,
      ]}
    />
  );
}

export function AvatarFallback({
  children,
  style,
  textStyle,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { size, hasLoaded, hasError } = React.useContext(AvatarContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  // If image loaded successfully without error, hide fallback
  if (hasLoaded && !hasError) return null;

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.primary,
        },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.fallbackText,
            { fontSize: Math.max(11, Math.floor(size * 0.42)) },
            textStyle,
          ]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
