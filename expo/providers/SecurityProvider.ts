import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppState, Platform, Alert } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { usePhraseSet } from '@/localization/runtime';
import { triggerHaptic } from '@/utils/haptics';

const SECURITY_SETTINGS_KEY = '@myrecordsmyhealth:security';

export interface SecuritySettings {
  biometricEnabled: boolean;
  autoLockEnabled: boolean;
  autoLockTimeoutMinutes: number;
  screenshotAdvisoryShown: boolean;
  emergencyTextPrimaryContactEnabled: boolean;
  documentShareReminderEnabled: boolean;
}

const DEFAULT_SECURITY: SecuritySettings = {
  biometricEnabled: false,
  autoLockEnabled: false,
  autoLockTimeoutMinutes: 5,
  screenshotAdvisoryShown: false,
  emergencyTextPrimaryContactEnabled: false,
  documentShareReminderEnabled: true,
};

export const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 3, label: '3 minutes' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
] as const;

async function loadSecuritySettings(): Promise<SecuritySettings> {
  try {
    const stored = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SecuritySettings>;
      console.log('[Security] Loaded settings from storage');
      return { ...DEFAULT_SECURITY, ...parsed };
    }
  } catch (e) {
    console.error('[Security] Error loading settings:', e);
  }
  return { ...DEFAULT_SECURITY };
}

async function persistSecuritySettings(settings: SecuritySettings): Promise<SecuritySettings> {
  try {
    await AsyncStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(settings));
    console.log('[Security] Settings persisted');
  } catch (e) {
    console.error('[Security] Error saving settings:', e);
  }
  return settings;
}

async function authenticateWithBiometrics(copy: {
  promptMessage: string;
  cancelLabel: string;
  fallbackLabel: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('[Security] Biometrics not available on web');
    return true;
  }
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      console.log('[Security] No biometric hardware available');
      return true;
    }
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      console.log('[Security] No biometric enrollment found');
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: copy.promptMessage,
      cancelLabel: copy.cancelLabel,
      disableDeviceFallback: false,
      fallbackLabel: copy.fallbackLabel,
    });
    console.log('[Security] Biometric result:', result.success);
    return result.success;
  } catch (e) {
    console.error('[Security] Biometric auth error:', e);
    return true;
  }
}

export const [SecurityProvider, useSecurity] = createContextHook(() => {
  const copy = usePhraseSet({
    biometricPrompt: 'Unlock MyRecordsMyHealth',
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use Passcode',
    screenshotAdvisoryTitle: 'Screenshot Advisory',
    screenshotAdvisoryMessage:
      'You are about to view sensitive health information. Please be mindful when taking screenshots — they may contain private medical data.\n\nScreenshots are stored in your device photo library and may sync to cloud services.',
    screenshotAdvisoryConfirm: 'I Understand',
  });
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const lastActiveRef = useRef<number>(Date.now());
  const appStateRef = useRef<string>(AppState.currentState);

  const settingsQuery = useQuery({
    queryKey: ['securitySettings'],
    queryFn: loadSecuritySettings,
  });

  const saveMutation = useMutation({
    mutationFn: persistSecuritySettings,
    onSuccess: (data) => {
      setSettings(data);
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        lastActiveRef.current = Date.now();
        console.log('[Security] App backgrounded, recording timestamp');
      }

      if ((appStateRef.current === 'background' || appStateRef.current === 'inactive') && nextAppState === 'active') {
        if (settings.autoLockEnabled || settings.biometricEnabled) {
          const elapsed = (Date.now() - lastActiveRef.current) / 1000 / 60;
          const timeout = settings.autoLockEnabled ? settings.autoLockTimeoutMinutes : 0;

          if (settings.biometricEnabled && elapsed >= timeout) {
            setIsLocked(true);
            console.log('[Security] App locked after ' + elapsed.toFixed(1) + ' minutes away');
          }
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [settings.autoLockEnabled, settings.autoLockTimeoutMinutes, settings.biometricEnabled]);

  const unlock = useCallback(async () => {
    if (isAuthenticating) return false;
    setIsAuthenticating(true);
    try {
      const success = await authenticateWithBiometrics({
        promptMessage: copy.biometricPrompt,
        cancelLabel: copy.cancelLabel,
        fallbackLabel: copy.fallbackLabel,
      });
      if (success) {
        setIsLocked(false);
        lastActiveRef.current = Date.now();
        void triggerHaptic('success');
        console.log('[Security] Unlocked successfully');
      } else {
        void triggerHaptic('error');
        console.log('[Security] Unlock failed');
      }
      return success;
    } finally {
      setIsAuthenticating(false);
    }
  }, [copy.biometricPrompt, copy.cancelLabel, copy.fallbackLabel, isAuthenticating]);

  const disableAppLock = useCallback(() => {
    const updated = { ...settings, biometricEnabled: false, autoLockEnabled: false };
    setSettings(updated);
    setIsLocked(false);
    lastActiveRef.current = Date.now();
    saveMutation.mutate(updated);
    void triggerHaptic('select');
    console.log('[Security] App lock disabled from lock screen');
  }, [saveMutation, settings]);

  const updateSetting = useCallback(
    <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      saveMutation.mutate(updated);
      console.log('[Security] Updated ' + key + ' to ' + String(value));
    },
    [settings, saveMutation]
  );

  const showScreenshotAdvisory = useCallback(() => {
    if (!settings.screenshotAdvisoryShown) {
      Alert.alert(copy.screenshotAdvisoryTitle, copy.screenshotAdvisoryMessage, [
        {
          text: copy.screenshotAdvisoryConfirm,
          onPress: () => updateSetting('screenshotAdvisoryShown', true),
        },
      ]);
    }
  }, [
    copy.screenshotAdvisoryConfirm,
    copy.screenshotAdvisoryMessage,
    copy.screenshotAdvisoryTitle,
    settings.screenshotAdvisoryShown,
    updateSetting,
  ]);

  const checkBiometricAvailability = useCallback(async (): Promise<{
    available: boolean;
    biometricType: string;
  }> => {
    if (Platform.OS === 'web') {
      return { available: false, biometricType: 'None' };
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType = 'Biometric';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'Iris';
      }

      return {
        available: hasHardware && isEnrolled,
        biometricType,
      };
    } catch (error) {
      console.warn('[Security] Biometric availability check unavailable:', error);
      return { available: false, biometricType: 'None' };
    }
  }, []);

  return useMemo(() => ({
    settings,
    isLocked,
    isAuthenticating,
    unlock,
    disableAppLock,
    updateSetting,
    showScreenshotAdvisory,
    checkBiometricAvailability,
    isLoading: settingsQuery.isLoading,
  }), [
    settings,
    isLocked,
    isAuthenticating,
    unlock,
    disableAppLock,
    updateSetting,
    showScreenshotAdvisory,
    checkBiometricAvailability,
    settingsQuery.isLoading,
  ]);
});
