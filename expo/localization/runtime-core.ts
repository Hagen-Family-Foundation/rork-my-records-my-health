import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateText } from '@rork-ai/toolkit-sdk';

const RUNTIME_TRANSLATION_CACHE_KEY = '@myrecordsmyhealth:runtime-translation-cache';
const runtimeTranslationCache = new Map<string, string>();
let persistedTranslationCache: Record<string, string> | null = null;
let persistedTranslationCachePromise: Promise<Record<string, string>> | null = null;

function getCacheKey(language: string, input: string): string {
  return language.trim().toLowerCase() + '::' + input;
}

async function loadPersistedTranslationCache(): Promise<Record<string, string>> {
  if (persistedTranslationCache) {
    return persistedTranslationCache;
  }

  if (!persistedTranslationCachePromise) {
    persistedTranslationCachePromise = AsyncStorage.getItem(RUNTIME_TRANSLATION_CACHE_KEY)
      .then((stored) => {
        if (!stored) {
          console.log('[RuntimeLocalization] No persisted translation cache found');
          persistedTranslationCache = {};
          return persistedTranslationCache;
        }

        try {
          const parsed = JSON.parse(stored) as Record<string, string>;
          persistedTranslationCache = parsed;
          console.log(
            '[RuntimeLocalization] Loaded persisted translation cache with entries:',
            Object.keys(parsed).length
          );
          return parsed;
        } catch (error) {
          console.error('[RuntimeLocalization] Failed to parse persisted cache:', error);
          persistedTranslationCache = {};
          return persistedTranslationCache;
        }
      })
      .catch((error) => {
        console.error('[RuntimeLocalization] Failed to load persisted cache:', error);
        persistedTranslationCache = {};
        return persistedTranslationCache;
      });
  }

  return persistedTranslationCachePromise;
}

async function persistTranslationCache(nextCache: Record<string, string>): Promise<void> {
  persistedTranslationCache = nextCache;
  persistedTranslationCachePromise = Promise.resolve(nextCache);

  try {
    await AsyncStorage.setItem(RUNTIME_TRANSLATION_CACHE_KEY, JSON.stringify(nextCache));
    console.log(
      '[RuntimeLocalization] Persisted translation cache entries:',
      Object.keys(nextCache).length
    );
  } catch (error) {
    console.error('[RuntimeLocalization] Failed to persist translation cache:', error);
  }
}

function sanitizeJsonResponse(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  return trimmed;
}

function parseTranslatedPhraseSet(response: string): Record<string, string> {
  const sanitized = sanitizeJsonResponse(response);

  try {
    const parsed = JSON.parse(sanitized) as Record<string, unknown>;
    const normalized = Object.entries(parsed).reduce<Record<string, string>>((accumulator, [key, value]) => {
      if (typeof value === 'string') {
        accumulator[key] = value.trim();
      }
      return accumulator;
    }, {});

    console.log(
      '[RuntimeLocalization] Parsed translated phrase set keys:',
      Object.keys(normalized)
    );

    return normalized;
  } catch (error) {
    console.error('[RuntimeLocalization] Failed to parse translated phrase set:', error);
    console.error('[RuntimeLocalization] Raw translation response:', response);
    return {};
  }
}

export async function translatePhraseSet<T extends Record<string, string>>(
  targetLanguage: string,
  phrases: T
): Promise<T> {
  const normalizedTargetLanguage = targetLanguage.trim();
  if (!normalizedTargetLanguage || normalizedTargetLanguage.toLowerCase() === 'english') {
    return phrases;
  }

  const phraseEntries = Object.entries(phrases);
  if (phraseEntries.length === 0) {
    return phrases;
  }

  const persistedCache = await loadPersistedTranslationCache();
  const resolvedPhrases: Record<string, string> = { ...phrases };
  const missingPhrases: Record<string, string> = {};

  phraseEntries.forEach(([key, value]) => {
    const cacheKey = getCacheKey(normalizedTargetLanguage, value);
    const memoryCached = runtimeTranslationCache.get(cacheKey);
    const persistedCached = persistedCache[cacheKey];
    const cached = memoryCached ?? persistedCached;

    if (cached) {
      resolvedPhrases[key] = cached;
      runtimeTranslationCache.set(cacheKey, cached);
      return;
    }

    missingPhrases[key] = value;
  });

  const missingKeys = Object.keys(missingPhrases);
  if (missingKeys.length === 0) {
    console.log('[RuntimeLocalization] All phrases resolved from cache for language:', normalizedTargetLanguage);
    return resolvedPhrases as T;
  }

  console.log(
    '[RuntimeLocalization] Translating phrases for language:',
    normalizedTargetLanguage,
    'missing keys:',
    missingKeys
  );

  const response = await generateText({
    messages: [
      {
        role: 'user',
        content:
          'Translate the JSON object values into the target app language and return only a valid JSON object with the exact same keys. ' +
          'Preserve placeholders like {count}, {name}, {phone}, acronyms such as DOB, DNR, QR, FHIR, AES-256-GCM, email addresses, URLs, bullet characters, punctuation, and capitalization when appropriate. ' +
          'Keep medical meaning accurate and concise. Do not add explanations or markdown. ' +
          'Target language: ' + normalizedTargetLanguage + '.\n\nJSON to translate:\n' + JSON.stringify(missingPhrases),
      },
    ],
  });

  const translated = parseTranslatedPhraseSet(response);
  const nextPersistedCache = { ...persistedCache };

  missingKeys.forEach((key) => {
    const sourceValue = missingPhrases[key];
    const translatedValue = translated[key] ?? sourceValue;
    const cacheKey = getCacheKey(normalizedTargetLanguage, sourceValue);

    runtimeTranslationCache.set(cacheKey, translatedValue);
    nextPersistedCache[cacheKey] = translatedValue;
    resolvedPhrases[key] = translatedValue;
  });

  await persistTranslationCache(nextPersistedCache);

  return resolvedPhrases as T;
}
