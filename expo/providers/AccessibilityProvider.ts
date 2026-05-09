import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AccessibilityInfo, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { setHapticEnabled } from '@/utils/haptics';

const A11Y_SETTINGS_KEY = '@myrecordsmyhealth:accessibility';

export type AccessibilityTextSizeLevel = 'default' | 'bigger' | 'large' | 'xl' | 'xxl' | 'max';

export interface AccessibilityTextSizeOption {
  level: AccessibilityTextSizeLevel;
  label: string;
  shortLabel: string;
  scale: number;
  description: string;
}

export const ACCESSIBILITY_TEXT_SIZE_OPTIONS: AccessibilityTextSizeOption[] = [
  { level: 'default', label: 'Default', shortLabel: 'Aa', scale: 1.0, description: 'Standard app text' },
  { level: 'bigger', label: 'Bigger', shortLabel: 'Aa+', scale: 1.2, description: 'Noticeably bigger' },
  { level: 'large', label: 'Large', shortLabel: 'A+', scale: 1.4, description: 'Easy reading' },
  { level: 'xl', label: 'XL', shortLabel: 'XL', scale: 1.6, description: 'Extra large' },
  { level: 'xxl', label: 'XXL', shortLabel: 'XXL', scale: 1.85, description: 'Very large' },
  { level: 'max', label: 'Max', shortLabel: 'MAX', scale: 2.1, description: 'Maximum size' },
];

export interface AccessibilitySettings {
  hapticFeedbackEnabled: boolean;
  highContrastMode: boolean;
  textSizeLevel: AccessibilityTextSizeLevel;
  reducedMotion: boolean;
  screenReaderAnnouncements: boolean;
  hapticCategorySignatures: boolean;
}

type StoredAccessibilitySettings = Partial<AccessibilitySettings> & {
  largeTextMode?: boolean;
};

const DEFAULT_SETTINGS: AccessibilitySettings = {
  hapticFeedbackEnabled: true,
  highContrastMode: false,
  textSizeLevel: 'default',
  reducedMotion: false,
  screenReaderAnnouncements: true,
  hapticCategorySignatures: true,
};

function isTextSizeLevel(value: unknown): value is AccessibilityTextSizeLevel {
  return ACCESSIBILITY_TEXT_SIZE_OPTIONS.some((option) => option.level === value);
}

function normalizeSettings(parsed: StoredAccessibilitySettings): AccessibilitySettings {
  const migratedTextSizeLevel: AccessibilityTextSizeLevel = isTextSizeLevel(parsed.textSizeLevel)
    ? parsed.textSizeLevel
    : parsed.largeTextMode
      ? 'large'
      : DEFAULT_SETTINGS.textSizeLevel;

  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    textSizeLevel: migratedTextSizeLevel,
  };
}

async function loadSettings(): Promise<AccessibilitySettings> {
  try {
    const stored = await AsyncStorage.getItem(A11Y_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredAccessibilitySettings;
      console.log('[Accessibility] Loaded settings from storage');
      return normalizeSettings(parsed);
    }
  } catch (e) {
    console.error('[Accessibility] Error loading settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

async function persistSettings(settings: AccessibilitySettings): Promise<AccessibilitySettings> {
  try {
    await AsyncStorage.setItem(A11Y_SETTINGS_KEY, JSON.stringify(settings));
    console.log('[Accessibility] Settings persisted');
  } catch (e) {
    console.error('[Accessibility] Error saving settings:', e);
  }
  return settings;
}

function getTextScale(level: AccessibilityTextSizeLevel): number {
  return ACCESSIBILITY_TEXT_SIZE_OPTIONS.find((option) => option.level === level)?.scale ?? 1.0;
}

export const [AccessibilityProvider, useAccessibility] = createContextHook(() => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [systemScreenReaderEnabled, setSystemScreenReaderEnabled] = useState<boolean>(false);

  const settingsQuery = useQuery({
    queryKey: ['accessibilitySettings'],
    queryFn: loadSettings,
  });

  const saveMutation = useMutation({
    mutationFn: persistSettings,
    onSuccess: (data) => {
      setSettings(data);
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
      setHapticEnabled(settingsQuery.data.hapticFeedbackEnabled);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const checkScreenReader = async () => {
      try {
        const enabled = await AccessibilityInfo.isScreenReaderEnabled();
        setSystemScreenReaderEnabled(enabled);
        console.log('[Accessibility] Screen reader detected:', enabled);
      } catch {
        console.log('[Accessibility] Could not check screen reader status');
      }
    };

    void checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      setSystemScreenReaderEnabled(enabled);
      console.log('[Accessibility] Screen reader changed:', enabled);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);

      if (key === 'hapticFeedbackEnabled') {
        setHapticEnabled(value as boolean);
      }

      saveMutation.mutate(updated);
      console.log('[Accessibility] Updated ' + key + ' to ' + String(value));
    },
    [settings, saveMutation]
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setHapticEnabled(DEFAULT_SETTINGS.hapticFeedbackEnabled);
    saveMutation.mutate(DEFAULT_SETTINGS);
    console.log('[Accessibility] Settings reset to defaults');
  }, [saveMutation]);

  const textScale = useMemo(() => {
    return getTextScale(settings.textSizeLevel);
  }, [settings.textSizeLevel]);

  const selectedTextSizeOption = useMemo(() => {
    return ACCESSIBILITY_TEXT_SIZE_OPTIONS.find((option) => option.level === settings.textSizeLevel) ?? ACCESSIBILITY_TEXT_SIZE_OPTIONS[0];
  }, [settings.textSizeLevel]);

  const announce = useCallback((message: string) => {
    if (settings.screenReaderAnnouncements && (systemScreenReaderEnabled || Platform.OS === 'web')) {
      try {
        AccessibilityInfo.announceForAccessibility(message);
        console.log('[Accessibility] Announced: ' + message);
      } catch {
        console.log('[Accessibility] Announcement unavailable');
      }
    }
  }, [settings.screenReaderAnnouncements, systemScreenReaderEnabled]);

  return useMemo(() => ({
    settings,
    systemScreenReaderEnabled,
    textScale,
    selectedTextSizeOption,
    updateSetting,
    resetSettings,
    announce,
    isLoading: settingsQuery.isLoading,
  }), [
    settings,
    systemScreenReaderEnabled,
    textScale,
    selectedTextSizeOption,
    updateSetting,
    resetSettings,
    announce,
    settingsQuery.isLoading,
  ]);
});
