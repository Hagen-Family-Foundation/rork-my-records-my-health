import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  DEFAULT_LANGUAGE_CODE,
  getLanguageMeta,
  isCustomLanguageCode,
  isPersistedLanguageCode,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '@/constants/languages';
import { DEFAULT_TRANSLATIONS, translate, type TranslationKey } from '@/localization/translations';
import { translatePhraseSet } from '@/localization/runtime-core';

const LANGUAGE_STORAGE_KEY = '@myrecordsmyhealth:language';

async function loadLanguage(): Promise<LanguageCode> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isPersistedLanguageCode(stored)) {
      console.log('[Localization] Loaded preferred language from storage:', stored);
      return stored;
    }
  } catch (error) {
    console.error('[Localization] Failed to load preferred language:', error);
  }

  console.log('[Localization] Falling back to default preferred language:', DEFAULT_LANGUAGE_CODE);
  return DEFAULT_LANGUAGE_CODE;
}

async function persistLanguage(language: LanguageCode): Promise<LanguageCode> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    console.log('[Localization] Persisted preferred language:', language);
  } catch (error) {
    console.error('[Localization] Failed to persist preferred language:', error);
  }

  return language;
}

export const [LocalizationProvider, useLocalization] = createContextHook(() => {
  const [preferredLanguage, setPreferredLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE_CODE);
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE_CODE);
  const [englishFallbackEnabled, setEnglishFallbackEnabledState] = useState<boolean>(false);

  const languageQuery = useQuery({
    queryKey: ['localization', 'preferred-language'],
    queryFn: loadLanguage,
  });

  const saveLanguageMutation = useMutation({
    mutationFn: persistLanguage,
    onSuccess: (savedLanguage) => {
      setPreferredLanguageState(savedLanguage);
      console.log('[Localization] Preferred language mutation completed:', savedLanguage);
    },
  });

  useEffect(() => {
    if (!languageQuery.isFetched) {
      return;
    }

    const loadedPreferredLanguage = languageQuery.data ?? DEFAULT_LANGUAGE_CODE;

    setPreferredLanguageState(loadedPreferredLanguage);
    setEnglishFallbackEnabledState(false);
    setLanguageState(loadedPreferredLanguage);

    console.log(
      '[Localization] Initialized language state. preferred=',
      loadedPreferredLanguage,
      'active=',
      loadedPreferredLanguage,
      'englishFallbackEnabled=',
      false
    );
  }, [languageQuery.data, languageQuery.isFetched]);

  const currentLanguage = useMemo(() => getLanguageMeta(language), [language]);
  const preferredLanguageMeta = useMemo(() => getLanguageMeta(preferredLanguage), [preferredLanguage]);

  const runtimeTranslationsQuery = useQuery({
    queryKey: ['localization', 'runtime-translations', language],
    queryFn: () =>
      translatePhraseSet(
        currentLanguage.isCustom
          ? currentLanguage.nativeName
          : currentLanguage.name + ' (' + currentLanguage.nativeName + ')',
        DEFAULT_TRANSLATIONS
      ),
    enabled: isCustomLanguageCode(language),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const languages = useMemo(() => {
    const customLanguage = currentLanguage.isCustom
      ? currentLanguage
      : preferredLanguageMeta.isCustom
        ? preferredLanguageMeta
        : null;

    if (!customLanguage) {
      return SUPPORTED_LANGUAGES;
    }

    const existing = SUPPORTED_LANGUAGES.find((item) => item.code === customLanguage.code);
    if (existing) {
      return SUPPORTED_LANGUAGES;
    }

    return [
      {
        code: customLanguage.code,
        name: customLanguage.name,
        nativeName: customLanguage.nativeName,
      },
      ...SUPPORTED_LANGUAGES,
    ];
  }, [currentLanguage, preferredLanguageMeta]);

  const setLanguage = useCallback(
    (nextLanguage: LanguageCode) => {
      setPreferredLanguageState(nextLanguage);
      setLanguageState(nextLanguage);
      saveLanguageMutation.mutate(nextLanguage);
      console.log('[Localization] Updated preferred and active language:', nextLanguage);
    },
    [saveLanguageMutation]
  );

  const activatePreferredLanguage = useCallback(() => {
    setLanguageState(preferredLanguage);
    console.log('[Localization] Activated preferred language for current session:', preferredLanguage);
  }, [preferredLanguage]);

  const useEnglish = useCallback(() => {
    setLanguageState(DEFAULT_LANGUAGE_CODE);
    console.log('[Localization] Activated English for current session');
  }, []);

  const setEnglishFallbackEnabled = useCallback(
    (_enabled: boolean) => {
      setEnglishFallbackEnabledState(false);
      setLanguageState(preferredLanguage);
      console.log('[Localization] English reset mode disabled; using selected language:', preferredLanguage);
    },
    [preferredLanguage]
  );

  const isUsingPreferredLanguage = language === preferredLanguage;

  const t = useCallback(
    (key: TranslationKey) => {
      if (isCustomLanguageCode(language)) {
        return runtimeTranslationsQuery.data?.[key] ?? DEFAULT_TRANSLATIONS[key];
      }

      return translate(language, key);
    },
    [language, runtimeTranslationsQuery.data]
  );

  return useMemo(
    () => ({
      language,
      currentLanguage,
      preferredLanguage,
      preferredLanguageMeta,
      languages,
      setLanguage,
      activatePreferredLanguage,
      useEnglish,
      englishFallbackEnabled,
      setEnglishFallbackEnabled,
      isUsingPreferredLanguage,
      t,
      isLoading: languageQuery.isLoading || runtimeTranslationsQuery.isLoading,
      isSaving: saveLanguageMutation.isPending,
    }),
    [
      activatePreferredLanguage,
      currentLanguage,
      englishFallbackEnabled,
      isUsingPreferredLanguage,
      language,
      languageQuery.isLoading,
      languages,
      preferredLanguage,
      preferredLanguageMeta,
      runtimeTranslationsQuery.isLoading,
      saveLanguageMutation.isPending,
      setEnglishFallbackEnabled,
      setLanguage,
      t,
      useEnglish,
    ]
  );
});
