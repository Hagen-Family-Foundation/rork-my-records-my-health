import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLanguageMeta } from '@/constants/languages';
import { translatePhraseSet } from '@/localization/runtime-core';
import { useLocalization } from '@/providers/LocalizationProvider';

export function interpolate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll('{' + key + '}', String(value));
  }, template);
}

export function usePhraseSet<T extends Record<string, string>>(phrases: T): T {
  const { language } = useLocalization();
  const phraseKey = useMemo(() => JSON.stringify(phrases), [phrases]);
  const targetLanguage = useMemo(() => {
    const languageMeta = getLanguageMeta(language);
    return languageMeta.code === 'en'
      ? 'English'
      : languageMeta.name + ' (' + languageMeta.nativeName + ')';
  }, [language]);

  const translationQuery = useQuery({
    queryKey: ['runtime-translation-phrases', language, phraseKey],
    queryFn: () => translatePhraseSet(targetLanguage, phrases),
    enabled: language !== 'en' && Object.keys(phrases).length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return useMemo(() => {
    if (language === 'en') {
      return phrases;
    }

    return {
      ...phrases,
      ...(translationQuery.data ?? {}),
    } as T;
  }, [language, phrases, translationQuery.data]);
}

export function useRuntimeText(input: string): string {
  const phraseSet = useMemo(() => ({ value: input }), [input]);
  return usePhraseSet(phraseSet).value;
}
