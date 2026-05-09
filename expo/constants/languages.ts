export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  isCustom: boolean;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'zh-TW', name: 'Taiwanese (Traditional Chinese)', nativeName: '繁體中文' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'rm', name: 'Romansh', nativeName: 'Rumantsch' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'zh-CN', name: 'Mandarin Chinese', nativeName: '普通话' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
] as const;

export type PresetLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export type CustomLanguageCode = `custom:${string}`;
export type LanguageCode = PresetLanguageCode | CustomLanguageCode;

export const DEFAULT_LANGUAGE_CODE: PresetLanguageCode = 'en';
export const CUSTOM_LANGUAGE_PREFIX = 'custom:' as const;

export function isSupportedLanguageCode(value: string | null | undefined): value is PresetLanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

export function isCustomLanguageCode(value: string | null | undefined): value is CustomLanguageCode {
  return Boolean(value?.startsWith(CUSTOM_LANGUAGE_PREFIX) && value.length > CUSTOM_LANGUAGE_PREFIX.length);
}

export function isPersistedLanguageCode(value: string | null | undefined): value is LanguageCode {
  return isSupportedLanguageCode(value) || isCustomLanguageCode(value);
}

export function createCustomLanguageCode(languageName: string): CustomLanguageCode {
  return `${CUSTOM_LANGUAGE_PREFIX}${normalizeCustomLanguageName(languageName)}`;
}

export function getCustomLanguageName(code: CustomLanguageCode): string {
  return code.slice(CUSTOM_LANGUAGE_PREFIX.length);
}

export function normalizeCustomLanguageName(languageName: string): string {
  return languageName.trim().replace(/\s+/g, ' ');
}

export function getLanguageMeta(code: LanguageCode): LanguageMeta {
  const presetLanguage = SUPPORTED_LANGUAGES.find((language) => language.code === code);
  if (presetLanguage) {
    return {
      code: presetLanguage.code,
      name: presetLanguage.name,
      nativeName: presetLanguage.nativeName,
      isCustom: false,
    };
  }

  if (isCustomLanguageCode(code)) {
    const customLanguageName = getCustomLanguageName(code);
    return {
      code,
      name: customLanguageName,
      nativeName: customLanguageName,
      isCustom: true,
    };
  }

  const defaultLanguage = SUPPORTED_LANGUAGES[0];
  return {
    code: defaultLanguage.code,
    name: defaultLanguage.name,
    nativeName: defaultLanguage.nativeName,
    isCustom: false,
  };
}
