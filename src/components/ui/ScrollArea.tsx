import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

export interface ScrollAreaProps extends ScrollViewProps {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function ScrollArea({
  style,
  contentContainerStyle,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollView
      style={[styles.scrollArea, style]}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      {...props}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
});
