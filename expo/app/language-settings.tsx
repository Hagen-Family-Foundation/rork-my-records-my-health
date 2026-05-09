import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { Text, TextInput } from '@/components/ScaledText';
import { Check, Languages } from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  createCustomLanguageCode,
  normalizeCustomLanguageName,
  type LanguageCode,
} from '@/constants/languages';
import { usePhraseSet } from '@/localization/runtime';
import { useLocalization } from '@/providers/LocalizationProvider';
import { triggerHaptic } from '@/utils/haptics';

export default function LanguageSettingsScreen() {
  const {
    currentLanguage,
    language,
    preferredLanguage,
    preferredLanguageMeta,
    languages,
    setLanguage,
    t,
  } = useLocalization();
  const [customLanguageName, setCustomLanguageName] = React.useState<string>('');
  const [customLanguageError, setCustomLanguageError] = React.useState<string>('');
  const runtimeCopy = usePhraseSet({
    activeLanguageLabel: 'Selected language',
    selectionMemoryNote:
      'The app starts in English on the very first startup. After you select a language here, that language remains in effect until you change it again in App Language.',
    userManualReturnNote:
      'If you came here from the User Manual, select the language you want, then tap the back arrow. You will return to the same spot in the User Manual to continue onboarding.',
    activeBadge: 'Active',
    customTitle: 'Add any language',
    customSubtitle:
      'Need a language that is not in the preset list? Enter it here and the app will adapt to it across the experience.',
    customPlaceholder: 'e.g. Greek, Hebrew, Thai, Polish, Yoruba',
    customButton: 'Use Custom Language',
    customErrorEmpty: 'Enter a language name to continue.',
    customActiveLabel: 'Current custom language',
    customHint:
      'Preset languages stay instant. Custom languages may take a moment the first time while phrases are translated and cached on this device.',
  });

  const handleSelect = useCallback(
    (nextLanguage: LanguageCode) => {
      if (nextLanguage === language) return;
      setCustomLanguageError('');
      void triggerHaptic('select');
      setLanguage(nextLanguage);
    },
    [language, setLanguage]
  );

  const handleApplyCustomLanguage = useCallback(() => {
    const normalizedName = normalizeCustomLanguageName(customLanguageName);
    if (!normalizedName) {
      setCustomLanguageError(runtimeCopy.customErrorEmpty);
      void triggerHaptic('error');
      return;
    }

    setCustomLanguageError('');
    void triggerHaptic('select');
    setLanguage(createCustomLanguageCode(normalizedName));
    setCustomLanguageName('');
  }, [customLanguageName, runtimeCopy.customErrorEmpty, setLanguage]);

  return (
    <>
      <Stack.Screen options={{ title: t('language.title') }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Languages color={Colors.primary} size={24} />
          </View>
          <Text style={styles.heroTitle}>{t('language.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('language.subtitle')}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{runtimeCopy.activeLanguageLabel}</Text>
          <Text style={styles.summaryValue}>{currentLanguage.nativeName}</Text>
          <Text style={styles.summaryNote}>{runtimeCopy.selectionMemoryNote}</Text>
        </View>

        <View style={styles.returnCard} testID="language-user-manual-return-note">
          <Text style={styles.returnNote}>{runtimeCopy.userManualReturnNote}</Text>
        </View>

        <View style={styles.customCard}>
          <Text style={styles.customTitle}>{runtimeCopy.customTitle}</Text>
          <Text style={styles.customSubtitle}>{runtimeCopy.customSubtitle}</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              value={customLanguageName}
              onChangeText={(value) => {
                setCustomLanguageName(value);
                if (customLanguageError) {
                  setCustomLanguageError('');
                }
              }}
              placeholder={runtimeCopy.customPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              testID="custom-language-input"
            />
            <TouchableOpacity
              style={styles.customButton}
              onPress={handleApplyCustomLanguage}
              testID="custom-language-apply"
            >
              <Text style={styles.customButtonText}>{runtimeCopy.customButton}</Text>
            </TouchableOpacity>
          </View>
          {preferredLanguageMeta.isCustom ? (
            <Text style={styles.customActiveText}>
              {runtimeCopy.customActiveLabel + ': ' + preferredLanguageMeta.nativeName}
            </Text>
          ) : null}
          {customLanguageError ? (
            <Text style={styles.customErrorText}>{customLanguageError}</Text>
          ) : null}
          <Text style={styles.customHint}>{runtimeCopy.customHint}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('language.availableLanguages')}</Text>
        <View style={styles.languageList}>
          {languages.map((item) => {
            const isSelected = item.code === preferredLanguage;
            const isActive = item.code === language;

            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.languageRow, isSelected ? styles.languageRowSelected : undefined]}
                onPress={() => handleSelect(item.code)}
                testID={String('language-option-' + item.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.languageTextWrap}>
                  <Text style={styles.languageNative}>{item.nativeName}</Text>
                  <Text style={styles.languageName}>{item.name}</Text>
                </View>
                <View style={styles.chipStack}>
                  {isSelected ? (
                    <View style={styles.selectedChip}>
                      <Check color={Colors.verified} size={14} />
                      <Text style={styles.selectedChipText}>
                        {t('language.selectedBadge')}
                      </Text>
                    </View>
                  ) : null}
                  {isActive && !isSelected ? (
                    <View style={styles.activeChip}>
                      <Text style={styles.activeChipText}>{runtimeCopy.activeBadge}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 18,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 20,
    gap: 10,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  summaryCard: {
    backgroundColor: Colors.verifiedLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
    padding: 16,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.verified,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  summaryNote: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  returnCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 14,
  },
  returnNote: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.primaryDark,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    paddingLeft: 4,
  },
  customCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  customTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  customSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  customInputRow: {
    gap: 10,
  },
  customInput: {
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  customActiveText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  customErrorText: {
    fontSize: 12,
    color: Colors.emergency,
    fontWeight: '600' as const,
  },
  customHint: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textTertiary,
  },
  languageList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  languageRowSelected: {
    backgroundColor: Colors.primaryLight,
  },
  languageTextWrap: {
    flex: 1,
    gap: 2,
  },
  languageNative: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  languageName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipStack: {
    alignItems: 'flex-end',
    gap: 6,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeChip: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.verified,
  },
});
