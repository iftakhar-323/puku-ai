import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, UIManager } from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height || 0;
      if (height > 0) {
        if (Platform.OS === 'android') {
          try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          } catch {}
        }
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);
      }
    };

    const onHide = () => {
      if (Platform.OS === 'android') {
        try {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch {}
      }
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const s1 = Keyboard.addListener('keyboardDidShow', onShow);
    const s2 = Keyboard.addListener('keyboardDidHide', onHide);
    const s3 = Keyboard.addListener('keyboardWillShow', onShow);
    const s4 = Keyboard.addListener('keyboardWillHide', onHide);

    return () => {
      s1.remove();
      s2.remove();
      s3.remove();
      s4.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
