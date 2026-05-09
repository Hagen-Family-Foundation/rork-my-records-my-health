import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/providers/AuthProvider';

const COMMUNICATIONS_STORAGE_KEY_SUFFIX = 'communications';

function getUserCommunicationsStorageKey(userId: string): string {
  return '@myrecordsmyhealth:' + userId + ':' + COMMUNICATIONS_STORAGE_KEY_SUFFIX;
}

export interface CommunicationPreferences {
  marketingEmailsEnabled: boolean;
  optInRequestOpenedAt: string | null;
}

const DEFAULT_COMMUNICATION_PREFERENCES: CommunicationPreferences = {
  marketingEmailsEnabled: false,
  optInRequestOpenedAt: null,
};

async function loadCommunicationPreferences(userId: string): Promise<CommunicationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(getUserCommunicationsStorageKey(userId));
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<CommunicationPreferences>;
      const merged = {
        ...DEFAULT_COMMUNICATION_PREFERENCES,
        ...parsed,
      };
      console.log('[Communications] Loaded communication preferences from storage');
      return merged;
    }
  } catch (error) {
    console.error('[Communications] Failed to load communication preferences:', error);
  }

  console.log('[Communications] Using default communication preferences');
  return { ...DEFAULT_COMMUNICATION_PREFERENCES };
}

async function persistCommunicationPreferences(
  userId: string,
  preferences: CommunicationPreferences
): Promise<CommunicationPreferences> {
  try {
    await AsyncStorage.setItem(getUserCommunicationsStorageKey(userId), JSON.stringify(preferences));
    console.log('[Communications] Persisted communication preferences:', preferences);
  } catch (error) {
    console.error('[Communications] Failed to persist communication preferences:', error);
    throw error;
  }

  return preferences;
}

async function clearCommunicationPreferences(userId: string): Promise<CommunicationPreferences> {
  try {
    await AsyncStorage.removeItem(getUserCommunicationsStorageKey(userId));
    console.log('[Communications] Cleared communication preferences');
  } catch (error) {
    console.error('[Communications] Failed to clear communication preferences:', error);
    throw error;
  }

  return { ...DEFAULT_COMMUNICATION_PREFERENCES };
}

export const [CommunicationsProvider, useCommunications] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';
  const [preferences, setPreferences] = useState<CommunicationPreferences>(DEFAULT_COMMUNICATION_PREFERENCES);

  const preferencesQuery = useQuery({
    queryKey: ['communications', 'preferences', userId],
    queryFn: () => loadCommunicationPreferences(userId),
  });

  const saveMutation = useMutation({
    mutationFn: (nextPreferences: CommunicationPreferences) => persistCommunicationPreferences(userId, nextPreferences),
    onSuccess: (nextPreferences) => {
      setPreferences(nextPreferences);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => clearCommunicationPreferences(userId),
    onSuccess: (nextPreferences) => {
      setPreferences(nextPreferences);
    },
  });

  useEffect(() => {
    setPreferences(DEFAULT_COMMUNICATION_PREFERENCES);
  }, [userId]);

  useEffect(() => {
    if (preferencesQuery.data) {
      setPreferences(preferencesQuery.data);
    }
  }, [preferencesQuery.data]);

  const setMarketingEmailsEnabled = useCallback(
    async (enabled: boolean) => {
      const previousPreferences = preferences;
      const nextPreferences: CommunicationPreferences = {
        ...preferences,
        marketingEmailsEnabled: enabled,
        optInRequestOpenedAt: enabled ? new Date().toISOString() : null,
      };

      setPreferences(nextPreferences);

      try {
        await saveMutation.mutateAsync(nextPreferences);
        console.log('[Communications] Updated marketing email preference:', enabled);
      } catch (error) {
        setPreferences(previousPreferences);
        console.error('[Communications] Reverted communication preference after persistence failure:', error);
        throw error;
      }
    },
    [preferences, saveMutation]
  );

  const resetPreferences = useCallback(async () => {
    await resetMutation.mutateAsync();
  }, [resetMutation]);

  return useMemo(
    () => ({
      preferences,
      setMarketingEmailsEnabled,
      resetPreferences,
      isLoading: preferencesQuery.isLoading,
      isSaving: saveMutation.isPending || resetMutation.isPending,
    }),
    [preferences, preferencesQuery.isLoading, resetMutation.isPending, resetPreferences, saveMutation.isPending, setMarketingEmailsEnabled]
  );
});
