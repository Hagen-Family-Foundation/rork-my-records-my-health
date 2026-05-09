import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const STARTUP_LEGAL_STORAGE_KEY = '@myrecordsmyhealth:startup-legal-v1';

export type StartupLegalStep = 'privacy' | 'disclaimer';

export interface StartupLegalPreferences {
  privacyAcknowledgedAt: string | null;
  disclaimerAcknowledgedAt: string | null;
  showPrivacyOnStartup: boolean;
  showDisclaimerOnStartup: boolean;
}

interface StartupLegalSessionState {
  privacy: boolean;
  disclaimer: boolean;
}

const DEFAULT_STARTUP_LEGAL_PREFERENCES: StartupLegalPreferences = {
  privacyAcknowledgedAt: null,
  disclaimerAcknowledgedAt: null,
  showPrivacyOnStartup: true,
  showDisclaimerOnStartup: true,
};

function normalizeStartupLegalPreferences(value: Partial<StartupLegalPreferences>): StartupLegalPreferences {
  return {
    privacyAcknowledgedAt:
      typeof value.privacyAcknowledgedAt === 'string' && value.privacyAcknowledgedAt.length > 0
        ? value.privacyAcknowledgedAt
        : null,
    disclaimerAcknowledgedAt:
      typeof value.disclaimerAcknowledgedAt === 'string' && value.disclaimerAcknowledgedAt.length > 0
        ? value.disclaimerAcknowledgedAt
        : null,
    showPrivacyOnStartup:
      typeof value.showPrivacyOnStartup === 'boolean'
        ? value.showPrivacyOnStartup
        : DEFAULT_STARTUP_LEGAL_PREFERENCES.showPrivacyOnStartup,
    showDisclaimerOnStartup:
      typeof value.showDisclaimerOnStartup === 'boolean'
        ? value.showDisclaimerOnStartup
        : DEFAULT_STARTUP_LEGAL_PREFERENCES.showDisclaimerOnStartup,
  };
}

async function loadStartupLegalPreferences(): Promise<StartupLegalPreferences> {
  try {
    const stored = await AsyncStorage.getItem(STARTUP_LEGAL_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_STARTUP_LEGAL_PREFERENCES };
    }

    const parsed = JSON.parse(stored) as Partial<StartupLegalPreferences>;
    return normalizeStartupLegalPreferences(parsed);
  } catch (error) {
    console.error('[StartupLegal] Failed to load startup legal preferences:', error);
    return { ...DEFAULT_STARTUP_LEGAL_PREFERENCES };
  }
}

async function saveStartupLegalPreferences(preferences: StartupLegalPreferences): Promise<void> {
  await AsyncStorage.setItem(STARTUP_LEGAL_STORAGE_KEY, JSON.stringify(preferences));
}

/** Provides the first-run Privacy Policy and Disclaimer acknowledgement gate. */
export const [StartupLegalProvider, useStartupLegal] = createContextHook(() => {
  const [preferences, setPreferences] = useState<StartupLegalPreferences>(DEFAULT_STARTUP_LEGAL_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasCompletedStartupCheck, setHasCompletedStartupCheck] = useState<boolean>(false);
  const [completedThisSession, setCompletedThisSession] = useState<StartupLegalSessionState>({
    privacy: false,
    disclaimer: false,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    loadStartupLegalPreferences()
      .then((loadedPreferences) => {
        if (!isMounted) {
          return;
        }

        setPreferences(loadedPreferences);
        console.log('[StartupLegal] Loaded startup acknowledgement preferences');
      })
      .catch((error) => {
        console.error('[StartupLegal] Unexpected startup legal load failure:', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentStartupStep = useMemo<StartupLegalStep | null>(() => {
    if (!isLoaded || hasCompletedStartupCheck) {
      return null;
    }

    const privacyDue =
      !completedThisSession.privacy &&
      (!preferences.privacyAcknowledgedAt || preferences.showPrivacyOnStartup);
    if (privacyDue) {
      return 'privacy';
    }

    const disclaimerDue =
      !completedThisSession.disclaimer &&
      (!preferences.disclaimerAcknowledgedAt || preferences.showDisclaimerOnStartup);
    if (disclaimerDue) {
      return 'disclaimer';
    }

    return null;
  }, [completedThisSession.disclaimer, completedThisSession.privacy, hasCompletedStartupCheck, isLoaded, preferences.disclaimerAcknowledgedAt, preferences.privacyAcknowledgedAt, preferences.showDisclaimerOnStartup, preferences.showPrivacyOnStartup]);

  const persistPreferences = useCallback(async (nextPreferences: StartupLegalPreferences) => {
    setPreferences(nextPreferences);
    setIsSaving(true);
    try {
      await saveStartupLegalPreferences(nextPreferences);
      console.log('[StartupLegal] Saved startup legal preferences');
    } catch (error) {
      console.error('[StartupLegal] Failed to save startup legal preferences:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const acknowledgeStep = useCallback(
    async (step: StartupLegalStep, showOnStartup: boolean): Promise<void> => {
      const acknowledgedAt = new Date().toISOString();
      const nextPreferences: StartupLegalPreferences =
        step === 'privacy'
          ? {
              ...preferences,
              privacyAcknowledgedAt: acknowledgedAt,
              showPrivacyOnStartup: showOnStartup,
            }
          : {
              ...preferences,
              disclaimerAcknowledgedAt: acknowledgedAt,
              showDisclaimerOnStartup: showOnStartup,
            };

      await persistPreferences(nextPreferences);
      setCompletedThisSession((current) => ({ ...current, [step]: true }));
    },
    [persistPreferences, preferences]
  );

  const setPrivacyStartupEnabled = useCallback(
    async (enabled: boolean): Promise<void> => {
      await persistPreferences({ ...preferences, showPrivacyOnStartup: enabled });
    },
    [persistPreferences, preferences]
  );

  const setDisclaimerStartupEnabled = useCallback(
    async (enabled: boolean): Promise<void> => {
      await persistPreferences({ ...preferences, showDisclaimerOnStartup: enabled });
    },
    [persistPreferences, preferences]
  );

  const markStartupCheckComplete = useCallback(() => {
    setHasCompletedStartupCheck(true);
  }, []);

  return useMemo(
    () => ({
      preferences,
      isLoaded,
      isSaving,
      currentStartupStep,
      acknowledgeStep,
      setPrivacyStartupEnabled,
      setDisclaimerStartupEnabled,
      markStartupCheckComplete,
    }),
    [acknowledgeStep, currentStartupStep, isLoaded, isSaving, markStartupCheckComplete, preferences, setDisclaimerStartupEnabled, setPrivacyStartupEnabled]
  );
});
