import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import createContextHook from '@nkzw/create-context-hook';
import {
  isSupabaseConfigured,
  normalizeSupabaseAuthErrorMessage,
  supabase,
} from '@/utils/supabase';

export const DEMO_ACCOUNT_EMAIL = 'support@myrecordsmyhealth.com';
export const DEMO_ACCOUNT_PASSWORD = 'myrecords';
const LEGACY_DEMO_ACCOUNT_EMAIL = 'myrecordsmyhealth';
const LEGACY_DEMO_ACCOUNT_PASSWORD = 'healthrecords';
const DEMO_SESSION_KEY = '@myrecordsmyhealth:demo-session';
const ACCESS_PIN_HASH_KEY = 'myrecordsmyhealth.access-pin-hash';
const ACCESS_PIN_SALT_KEY = 'myrecordsmyhealth.access-pin-salt';
const ACCESS_BIOMETRIC_KEY = 'myrecordsmyhealth.access-biometric-enabled';
const ACCESS_PIN_CREATED_KEY = '@myrecordsmyhealth:access-pin-created';
const ACCESS_LOCK_DISABLED_KEY = '@myrecordsmyhealth:access-lock-disabled';
const SECURITY_SETTINGS_KEY = '@myrecordsmyhealth:security';
const SECURE_STORE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;
const DEFAULT_ACCESS_BIOMETRIC_INFO: AccessBiometricInfo = {
  available: false,
  biometricType: 'Biometric',
};

async function safeSecureStoreGetItem(key: string): Promise<string | null> {
  if (!SECURE_STORE_KEY_PATTERN.test(key)) {
    console.warn('[Auth] Blocked invalid SecureStore read key:', key);
    return null;
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn('[Auth] SecureStore read failed for key:', key, error);
    return null;
  }
}

async function safeSecureStoreSetItem(key: string, value: string): Promise<void> {
  if (!SECURE_STORE_KEY_PATTERN.test(key)) {
    console.warn('[Auth] Blocked invalid SecureStore write key:', key);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function safeSecureStoreDeleteItem(key: string): Promise<void> {
  if (!SECURE_STORE_KEY_PATTERN.test(key)) {
    console.warn('[Auth] Blocked invalid SecureStore delete key:', key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

async function readStoredAccessPinHash(): Promise<string | null> {
  const storedPinHash = await safeSecureStoreGetItem(ACCESS_PIN_HASH_KEY);
  const pinCreatedMarker = await AsyncStorage.getItem(ACCESS_PIN_CREATED_KEY);

  if (!storedPinHash && pinCreatedMarker === 'true') {
    console.warn('[Auth] Saved PIN marker found, but PIN hash was unavailable. Resetting to NONE access mode to avoid a blocked lock screen.');
    await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'true');
    await AsyncStorage.removeItem(ACCESS_PIN_CREATED_KEY);
    await safelyClearAccessLockStorage();
    return null;
  }

  return storedPinHash;
}

function isDemoCredential(email: string, password: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    (normalizedEmail === DEMO_ACCOUNT_EMAIL && password === DEMO_ACCOUNT_PASSWORD) ||
    ((normalizedEmail === LEGACY_DEMO_ACCOUNT_EMAIL || normalizedEmail === 'myrecordsmyhealth@demo.local') &&
      password === LEGACY_DEMO_ACCOUNT_PASSWORD)
  );
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  fullName: string;
  email: string;
  password: string;
}

interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

export type AuthAccessMode = 'none' | 'demo' | 'account';

export interface AccessBiometricInfo {
  available: boolean;
  biometricType: string;
}

function isValidAccessPin(pin: string): boolean {
  return /^\d{4}$/.test(pin) || /^\d{6}$/.test(pin);
}

async function hashAccessPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + pin + ':myrecordsmyhealth');
}

async function getAccessBiometricInfo(): Promise<AccessBiometricInfo> {
  if (Platform.OS === 'web') {
    console.log('[Auth] Local biometric access is unavailable on web preview');
    return { available: false, biometricType: 'Biometric' };
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

    return { available: hasHardware && isEnrolled, biometricType };
  } catch (error) {
    console.warn('[Auth] Local biometric access check unavailable:', error);
    return DEFAULT_ACCESS_BIOMETRIC_INFO;
  }
}

async function runAccessBiometricPrompt(biometricType: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock MyRecordsMyHealth',
      promptSubtitle: 'Use ' + biometricType + ' to open your records',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    console.log('[Auth] Biometric access result:', result.success);
    return result.success;
  } catch (error) {
    console.error('[Auth] Biometric access prompt failed:', error);
    return false;
  }
}

async function safelyClearAccessLockStorage(): Promise<void> {
  const results = await Promise.allSettled([
    safeSecureStoreDeleteItem(ACCESS_PIN_HASH_KEY),
    safeSecureStoreDeleteItem(ACCESS_PIN_SALT_KEY),
    safeSecureStoreSetItem(ACCESS_BIOMETRIC_KEY, 'false'),
  ]);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn('[Auth] Access lock cleanup warning at step ' + String(index) + ':', result.reason);
    }
  });
}

async function disablePersistedAppGates(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
    const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
    const updated = {
      ...parsed,
      biometricEnabled: false,
      autoLockEnabled: false,
    };
    await AsyncStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(updated));
    console.log('[Auth] Persisted app lock gates disabled for NONE access mode');
  } catch (error) {
    console.warn('[Auth] Could not persist app lock gate reset:', error);
  }
}

async function loadSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    console.warn('[Auth] Supabase environment variables are missing');
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[Auth] Failed to load session:', error.message);
    throw error;
  }

  console.log('[Auth] Session bootstrap completed. hasSession=', Boolean(data.session));
  return data.session;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isLocalAccessReady, setIsLocalAccessReady] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);
  const [isAccessLockDisabled, setIsAccessLockDisabled] = useState<boolean>(false);
  const [hasAccessPin, setHasAccessPin] = useState<boolean>(false);
  const [accessBiometricEnabled, setAccessBiometricEnabledState] = useState<boolean>(false);
  const [accessBiometricInfo, setAccessBiometricInfo] = useState<AccessBiometricInfo>(DEFAULT_ACCESS_BIOMETRIC_INFO);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const storedDemoSession = await AsyncStorage.getItem(DEMO_SESSION_KEY);
        const storedPinHash = await readStoredAccessPinHash();
        const storedLockDisabled = await AsyncStorage.getItem(ACCESS_LOCK_DISABLED_KEY);
        const storedBiometricPreference = await safeSecureStoreGetItem(ACCESS_BIOMETRIC_KEY);
        const isAccessLockDisabled = storedLockDisabled === 'true';
        const hasStoredPin = !isAccessLockDisabled && Boolean(storedPinHash);
        const shouldRestoreBiometric = hasStoredPin && storedBiometricPreference === 'true';
        const biometricInfo = shouldRestoreBiometric ? await getAccessBiometricInfo() : DEFAULT_ACCESS_BIOMETRIC_INFO;

        setHasAccessPin(hasStoredPin);
        setAccessBiometricEnabledState(shouldRestoreBiometric && biometricInfo.available);
        setAccessBiometricInfo(biometricInfo);

        if (isAccessLockDisabled) {
          console.log('[Auth] Restored NONE access mode; no PIN, biometric, or email/password gate required');
          setIsAccessLockDisabled(true);
          setIsDemoSession(false);
          await AsyncStorage.removeItem(DEMO_SESSION_KEY);
        } else if (storedDemoSession === 'true' && !hasStoredPin) {
          console.log('[Auth] Restored password-based local session');
          setIsAccessLockDisabled(false);
          setIsDemoSession(true);
        } else if (storedDemoSession === 'true' && hasStoredPin) {
          console.log('[Auth] PIN exists; requiring local unlock before restoring access');
          setIsAccessLockDisabled(false);
        } else {
          setIsAccessLockDisabled(false);
        }
      } catch (e) {
        console.error('[Auth] Failed to restore local access state:', e);
      } finally {
        setIsLocalAccessReady(true);
      }
    })();
  }, []);

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: loadSession,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (!sessionQuery.isFetched) {
      return;
    }

    setSession(sessionQuery.data ?? null);
    setIsReady(true);

    if (sessionQuery.error) {
      const message = normalizeSupabaseAuthErrorMessage(sessionQuery.error.message);
      setErrorMessage(message);
      console.error('[Auth] Session bootstrap error:', sessionQuery.error.message);
      return;
    }

    setErrorMessage(null);
  }, [sessionQuery.data, sessionQuery.error, sessionQuery.isFetched]);

  const handleSessionChange = useCallback(
    (event: AuthChangeEvent, nextSession: Session | null) => {
      console.log('[Auth] Auth state changed:', event, 'hasSession=', Boolean(nextSession));
      setSession(nextSession);
      setIsReady(true);
      setErrorMessage(null);
      queryClient.setQueryData(['auth', 'session'], nextSession);
    },
    [queryClient]
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsReady(true);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleSessionChange);

    return () => {
      subscription.unsubscribe();
    };
  }, [handleSessionChange]);

  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web') {
      return;
    }

    const syncRefreshState = async (state: AppStateStatus) => {
      if (state === 'active') {
        console.log('[Auth] App active, starting session auto refresh');
        await supabase.auth.startAutoRefresh();
        return;
      }

      console.log('[Auth] App inactive, stopping session auto refresh');
      await supabase.auth.stopAutoRefresh();
    };

    void syncRefreshState(AppState.currentState ?? 'active');

    const subscription = AppState.addEventListener('change', (nextState) => {
      void syncRefreshState(nextState);
    });

    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: SignInPayload): Promise<Session | null> => {
      if (isDemoCredential(email, password)) {
        console.log('[Auth] Demo account sign in accepted');
        await AsyncStorage.setItem(DEMO_SESSION_KEY, 'true');
        await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'false');
        setIsAccessLockDisabled(false);
        setIsDemoSession(true);
        return null;
      }

      if (!isSupabaseConfigured) {
        throw new Error('Authentication is not configured yet.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      console.log('[Auth] Attempting password sign in for:', normalizedEmail);

      await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'false');
      setIsAccessLockDisabled(false);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.error('[Auth] Sign in failed:', error.message);
        throw error;
      }

      console.log('[Auth] Sign in succeeded. hasSession=', Boolean(data.session));
      return data.session;
    },
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: (nextSession) => {
      setIsAccessLockDisabled(false);
      setSession(nextSession);
      queryClient.setQueryData(['auth', 'session'], nextSession);
    },
    onError: (error) => {
      const message = normalizeSupabaseAuthErrorMessage(error.message);
      setErrorMessage(message);
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ fullName, email, password }: SignUpPayload) => {
      if (!isSupabaseConfigured) {
        throw new Error('Authentication is not configured yet.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedFullName = fullName.trim();
      console.log('[Auth] Attempting account creation for:', normalizedEmail);

      await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'false');
      setIsAccessLockDisabled(false);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: normalizedFullName
          ? {
              data: {
                full_name: normalizedFullName,
              },
            }
          : undefined,
      });

      if (error) {
        console.error('[Auth] Sign up failed:', error.message);
        throw error;
      }

      console.log(
        '[Auth] Sign up completed. hasUser=',
        Boolean(data.user),
        'hasSession=',
        Boolean(data.session)
      );

      return data;
    },
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: (data) => {
      setIsAccessLockDisabled(false);
      setSession(data.session ?? null);
      queryClient.setQueryData(['auth', 'session'], data.session ?? null);
    },
    onError: (error) => {
      const message = normalizeSupabaseAuthErrorMessage(error.message);
      setErrorMessage(message);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (isDemoSession) {
        console.log('[Auth] Clearing demo session');
        await AsyncStorage.removeItem(DEMO_SESSION_KEY);
        setIsDemoSession(false);
        return;
      }

      if (!isSupabaseConfigured) {
        setSession(null);
        queryClient.setQueryData(['auth', 'session'], null);
        return;
      }

      console.log('[Auth] Signing out current user');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[Auth] Sign out failed:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      setSession(null);
      setErrorMessage(null);
      queryClient.setQueryData(['auth', 'session'], null);
      console.log('[Auth] User signed out successfully');
    },
    onError: (error) => {
      const message = normalizeSupabaseAuthErrorMessage(error.message);
      setErrorMessage(message);
    },
  });

  const signIn = useCallback(
    async (payload: SignInPayload) => {
      await signInMutation.mutateAsync(payload);
    },
    [signInMutation]
  );

  const signUp = useCallback(
    async (payload: SignUpPayload): Promise<SignUpResult> => {
      const data = await signUpMutation.mutateAsync(payload);
      return {
        requiresEmailConfirmation: Boolean(data.user && !data.session),
      };
    },
    [signUpMutation]
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(ACCESS_LOCK_DISABLED_KEY);
    setIsAccessLockDisabled(false);
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  const createAccessPin = useCallback(async (pin: string): Promise<boolean> => {
    const normalizedPin = pin.trim();
    if (!isValidAccessPin(normalizedPin)) {
      setErrorMessage('Choose a 4 or 6 digit PIN.');
      console.warn('[Auth] PIN setup blocked due to invalid length');
      return false;
    }

    try {
      setIsUnlocking(true);
      const salt = Crypto.randomUUID();
      const hashedPin = await hashAccessPin(normalizedPin, salt);
      await safeSecureStoreSetItem(ACCESS_PIN_SALT_KEY, salt);
      await safeSecureStoreSetItem(ACCESS_PIN_HASH_KEY, hashedPin);
      await AsyncStorage.setItem(DEMO_SESSION_KEY, 'true');
      await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'false');
      await AsyncStorage.setItem(ACCESS_PIN_CREATED_KEY, 'true');
      setHasAccessPin(true);
      setIsAccessLockDisabled(false);
      setIsDemoSession(true);
      setErrorMessage(null);
      console.log('[Auth] Access PIN created');
      return true;
    } catch (error) {
      console.error('[Auth] Failed to create access PIN:', error);
      setErrorMessage('Could not save your PIN. Please try again.');
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const normalizedPin = pin.trim();
    if (!isValidAccessPin(normalizedPin)) {
      setErrorMessage('Enter your 4 or 6 digit PIN.');
      return false;
    }

    try {
      setIsUnlocking(true);
      const [storedSalt, storedHash] = await Promise.all([
        safeSecureStoreGetItem(ACCESS_PIN_SALT_KEY),
        safeSecureStoreGetItem(ACCESS_PIN_HASH_KEY),
      ]);

      if (!storedSalt || !storedHash) {
        setHasAccessPin(false);
        setErrorMessage('No PIN is set up yet. Create one to continue.');
        console.warn('[Auth] PIN unlock requested without saved PIN');
        return false;
      }

      const candidateHash = await hashAccessPin(normalizedPin, storedSalt);
      if (candidateHash !== storedHash) {
        setErrorMessage('That PIN did not match. Please try again.');
        console.warn('[Auth] PIN unlock failed');
        return false;
      }

      await AsyncStorage.setItem(DEMO_SESSION_KEY, 'true');
      await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'false');
      setIsAccessLockDisabled(false);
      setIsDemoSession(true);
      setErrorMessage(null);
      console.log('[Auth] PIN unlock succeeded');
      return true;
    } catch (error) {
      console.error('[Auth] PIN unlock error:', error);
      setErrorMessage('Could not unlock right now. Please try again.');
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!hasAccessPin) {
      setErrorMessage('Create a PIN before using biometric unlock.');
      return false;
    }

    if (!accessBiometricEnabled) {
      setErrorMessage('Biometric unlock is not enabled yet. Use your PIN first.');
      return false;
    }

    if (!accessBiometricInfo.available) {
      setErrorMessage(accessBiometricInfo.biometricType + ' is not available on this device.');
      return false;
    }

    try {
      setIsUnlocking(true);
      const success = await runAccessBiometricPrompt(accessBiometricInfo.biometricType);
      if (success) {
        await AsyncStorage.setItem(DEMO_SESSION_KEY, 'true');
        await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'false');
        setIsAccessLockDisabled(false);
        setIsDemoSession(true);
        setErrorMessage(null);
        console.log('[Auth] Biometric unlock succeeded');
        return true;
      }

      setErrorMessage('Biometric unlock was cancelled or did not match.');
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [accessBiometricEnabled, accessBiometricInfo.available, accessBiometricInfo.biometricType, hasAccessPin]);

  const setAccessBiometricEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled && !hasAccessPin) {
      setErrorMessage('Create a PIN before turning on biometric unlock.');
      return false;
    }

    if (enabled && !accessBiometricInfo.available) {
      setErrorMessage(accessBiometricInfo.biometricType + ' is not available on this device.');
      return false;
    }

    if (enabled) {
      const success = await runAccessBiometricPrompt(accessBiometricInfo.biometricType);
      if (!success) {
        setErrorMessage('Biometric confirmation was cancelled.');
        return false;
      }
    }

    await safeSecureStoreSetItem(ACCESS_BIOMETRIC_KEY, enabled ? 'true' : 'false');
    setAccessBiometricEnabledState(enabled);
    setErrorMessage(null);
    console.log('[Auth] Biometric access preference updated:', enabled);
    return true;
  }, [accessBiometricInfo.available, accessBiometricInfo.biometricType, hasAccessPin]);

  const resetAccessPin = useCallback(async (): Promise<void> => {
    try {
      await safelyClearAccessLockStorage();
      await disablePersistedAppGates();
      await AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'true');
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      await AsyncStorage.removeItem(ACCESS_PIN_CREATED_KEY);
      setHasAccessPin(false);
      setAccessBiometricEnabledState(false);
      setIsAccessLockDisabled(true);
      setIsDemoSession(false);
      console.log('[Auth] Access PIN reset; NONE access mode enabled');
    } catch (error) {
      console.error('[Auth] Failed to reset access PIN:', error);
      setErrorMessage('Could not reset your PIN. Please try again.');
    }
  }, []);

  const continueWithoutAccessLock = useCallback(async (): Promise<boolean> => {
    try {
      setIsUnlocking(true);
      setHasAccessPin(false);
      setAccessBiometricEnabledState(false);
      setIsAccessLockDisabled(true);
      setIsDemoSession(false);
      setSession(null);
      setErrorMessage(null);
      queryClient.setQueryData(['auth', 'session'], null);
      await Promise.all([
        AsyncStorage.removeItem(DEMO_SESSION_KEY),
        AsyncStorage.removeItem(ACCESS_PIN_CREATED_KEY),
        AsyncStorage.setItem(ACCESS_LOCK_DISABLED_KEY, 'true'),
        safelyClearAccessLockStorage(),
        disablePersistedAppGates(),
      ]);
      console.log('[Auth] Continued with NONE access mode; no PIN, biometric, or email/password gate remains');
      return true;
    } catch (error) {
      console.error('[Auth] Failed to continue without access lock:', error);
      setErrorMessage('Could not update access settings. Please try again.');
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [queryClient]);

  const refreshAccessBiometricInfo = useCallback(async (): Promise<AccessBiometricInfo> => {
    const info = await getAccessBiometricInfo();
    setAccessBiometricInfo(info);
    return info;
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const user = useMemo<User | null>(() => {
    if (isAccessLockDisabled) {
      return {
        id: 'demo-user',
        user_metadata: { full_name: 'Local Access' },
        app_metadata: { access_mode: 'none' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;
    }

    if (isDemoSession) {
      return {
        id: 'demo-user',
        email: DEMO_ACCOUNT_EMAIL,
        user_metadata: { full_name: 'Demo User' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;
    }
    return session?.user ?? null;
  }, [session, isDemoSession, isAccessLockDisabled]);
  const authAccessMode: AuthAccessMode = isAccessLockDisabled ? 'none' : isDemoSession ? 'demo' : 'account';
  const isAuthenticated = Boolean(user);
  const isLoading = !isReady || !isLocalAccessReady || (sessionQuery.isLoading && !isDemoSession && !isAccessLockDisabled);

  return useMemo(
    () => ({
      session,
      user,
      isAuthenticated,
      authAccessMode,
      isAccessLockDisabled,
      isConfigured: isSupabaseConfigured || true,
      isReady,
      isLoading,
      errorMessage,
      signIn,
      signUp,
      signOut,
      clearError,
      hasAccessPin,
      accessBiometricEnabled,
      accessBiometricInfo,
      isUnlocking,
      createAccessPin,
      unlockWithPin,
      unlockWithBiometrics,
      setAccessBiometricEnabled,
      resetAccessPin,
      continueWithoutAccessLock,
      refreshAccessBiometricInfo,
      isSigningIn: signInMutation.isPending,
      isSigningUp: signUpMutation.isPending,
      isSigningOut: signOutMutation.isPending,
    }),
    [
      clearError,
      accessBiometricEnabled,
      accessBiometricInfo,
      clearError,
      createAccessPin,
      errorMessage,
      hasAccessPin,
      continueWithoutAccessLock,
      isAccessLockDisabled,
      authAccessMode,
      isAuthenticated,
      isLoading,
      isReady,
      isUnlocking,
      refreshAccessBiometricInfo,
      resetAccessPin,
      session,
      setAccessBiometricEnabled,
      signIn,
      signInMutation.isPending,
      signOut,
      signOutMutation.isPending,
      signUp,
      signUpMutation.isPending,
      unlockWithBiometrics,
      unlockWithPin,
      user,
    ]
  );
});
