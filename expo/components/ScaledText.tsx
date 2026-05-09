import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { useAccessibility } from '@/providers/AccessibilityProvider';

const DEFAULT_TEXT_SIZE = 14;
const DEFAULT_INPUT_SIZE = 14;

function roundSize(value: number): number {
  return Math.round(value * 100) / 100;
}

function useTextScale(): number {
  const accessibility = useAccessibility();
  return accessibility?.textScale ?? 1;
}

function getScaledStyle(
  style: StyleProp<TextStyle>,
  textScale: number,
  defaultFontSize: number
): StyleProp<TextStyle> {
  if (textScale <= 1.01) {
    return style;
  }

  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseFontSize = typeof flatStyle?.fontSize === 'number' ? flatStyle.fontSize : defaultFontSize;
  const scaledStyle: TextStyle = {
    fontSize: roundSize(baseFontSize * textScale),
  };

  if (typeof flatStyle?.lineHeight === 'number') {
    scaledStyle.lineHeight = roundSize(flatStyle.lineHeight * textScale);
  }

  return [style, scaledStyle];
}

export const Text = React.memo(
  React.forwardRef<React.ElementRef<typeof RNText>, TextProps>(function ScaledText({ style, ...props }, ref) {
    const textScale = useTextScale();
    const scaledStyle = useMemo(() => getScaledStyle(style, textScale, DEFAULT_TEXT_SIZE), [style, textScale]);

    return <RNText ref={ref} style={scaledStyle} {...props} />;
  })
);

export const TextInput = React.memo(
  React.forwardRef<React.ElementRef<typeof RNTextInput>, TextInputProps>(function ScaledTextInput(
    { style, ...props },
    ref
  ) {
    const textScale = useTextScale();
    const scaledStyle = useMemo(() => getScaledStyle(style, textScale, DEFAULT_INPUT_SIZE), [style, textScale]);

    return <RNTextInput ref={ref} style={scaledStyle} {...props} />;
  })
);
