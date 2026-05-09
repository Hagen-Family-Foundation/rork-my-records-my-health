import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  Hand,
  Eye,
  Type,
  Vibrate,
  Volume2,
  RotateCcw,
  Info,
  Accessibility,
  Waves,
  Zap,
} from 'lucide-react-native';
import { Text } from '@/components/ScaledText';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import {
  ACCESSIBILITY_TEXT_SIZE_OPTIONS,
  useAccessibility,
  type AccessibilityTextSizeLevel,
} from '@/providers/AccessibilityProvider';
import { triggerHaptic, HAPTIC_PATTERN_DESCRIPTIONS, type HapticPattern } from '@/utils/haptics';

export default function AccessibilitySettingsScreen() {
  const { settings, updateSetting, resetSettings, selectedTextSizeOption } = useAccessibility();
  const copy = usePhraseSet({
    headerTitle: 'Accessibility Preferences',
    headerSubtitle: 'Customize how the app communicates with you through touch, sight, and sound.',
    sectionHaptics: 'HAPTIC FEEDBACK',
    hapticTitle: 'Haptic Feedback',
    hapticDescription: 'Stronger vibration patterns for navigation, confirmations, alerts, and record sections',
    hapticAccessibilityLabel: 'Toggle haptic feedback',
    hapticAccessibilityHint: 'Enables or disables vibration feedback throughout the app',
    categorySignaturesTitle: 'Category Signatures',
    categorySignaturesDescription:
      'Unique vibration patterns when entering different record sections (medications, allergies, etc.)',
    categorySignaturesAccessibilityLabel: 'Toggle category haptic signatures',
    testHapticButton: 'Test Strong Haptic',
    testHapticHint: 'Runs a strong vibration sequence on phones that support haptics',
    hapticDeviceNote: 'Best tested on a real phone. Browser previews and some tablets may not physically vibrate.',
    demoTitle: 'Try Haptic Patterns',
    demoSubtitle: 'Tap to feel each pattern. Each has a distinct feel to help identify actions by touch.',
    demoNavigate: 'Navigate',
    demoSelect: 'Select',
    demoSuccess: 'Success / Save',
    demoWarning: 'Warning',
    demoError: 'Error / Delete',
    demoEmergency: 'Emergency Access',
    demoMedications: 'Medications',
    demoAllergies: 'Allergies',
    demoAccessibilityLabel: 'Try {label} haptic pattern',
    sectionVisual: 'VISUAL',
    highContrastTitle: 'High Contrast Mode',
    highContrastDescription: 'Stronger colors and borders for improved visibility',
    highContrastAccessibilityLabel: 'Toggle high contrast mode',
    textSizeTitle: 'Text Size',
    textSizeDescription: 'Choose one of six real text sizes. Current size: {size}',
    textSizeAccessibilityLabel: 'Set text size to {size}',
    previewTitle: 'Live text preview',
    previewBody: 'This is how medical notes, forms, buttons, and labels will read across the app.',
    previewMeta: 'Selected: {size} ({percent}%)',
    sectionScreenReader: 'SCREEN READER',
    announcementsTitle: 'Screen Reader Announcements',
    announcementsDescription: 'Additional spoken feedback for actions like saving, navigating, and status changes',
    announcementsAccessibilityLabel: 'Toggle screen reader announcements',
    reducedMotionTitle: 'Reduced Motion',
    reducedMotionDescription: 'Minimize animations for users sensitive to motion',
    reducedMotionAccessibilityLabel: 'Toggle reduced motion',
    infoText:
      'This app is designed to work with VoiceOver (iOS) and TalkBack (Android). All interactive elements include descriptive labels, roles, and hints for screen reader users. Haptic patterns provide distinct touch signatures for different actions — helping people with low vision, blindness, and other accessibility needs navigate more confidently by feel.',
    resetAccessibilityLabel: 'Reset accessibility settings to defaults',
    resetButton: 'Reset to Defaults',
  });

  const demoPatterns: { pattern: HapticPattern; label: string }[] = [
    { pattern: 'navigate', label: copy.demoNavigate },
    { pattern: 'select', label: copy.demoSelect },
    { pattern: 'success', label: copy.demoSuccess },
    { pattern: 'warning', label: copy.demoWarning },
    { pattern: 'error', label: copy.demoError },
    { pattern: 'emergencyAccess', label: copy.demoEmergency },
    { pattern: 'categoryMedications', label: copy.demoMedications },
    { pattern: 'categoryAllergies', label: copy.demoAllergies },
  ];

  const handleToggle = useCallback(
    (key: 'hapticFeedbackEnabled' | 'hapticCategorySignatures' | 'highContrastMode' | 'screenReaderAnnouncements' | 'reducedMotion', value: boolean) => {
      updateSetting(key, value);
      void triggerHaptic('toggle');
    },
    [updateSetting]
  );

  const handleTextSizeSelect = useCallback(
    (level: AccessibilityTextSizeLevel) => {
      updateSetting('textSizeLevel', level);
      void triggerHaptic('select');
    },
    [updateSetting]
  );

  const handleDemoHaptic = useCallback((pattern: HapticPattern) => {
    void triggerHaptic(pattern);
  }, []);

  const handleTestHaptic = useCallback(() => {
    void triggerHaptic('testStrong');
  }, []);

  const handleReset = useCallback(() => {
    resetSettings();
    void triggerHaptic('success');
  }, [resetSettings]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Accessibility color={Colors.primary} size={24} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          {copy.headerTitle}
        </Text>
        <Text style={styles.headerSubtitle}>{copy.headerSubtitle}</Text>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle}>{copy.sectionHaptics}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
              <Vibrate color={Colors.primary} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.hapticTitle}</Text>
              <Text style={styles.settingDescription}>{copy.hapticDescription}</Text>
            </View>
            <Switch
              value={settings.hapticFeedbackEnabled}
              onValueChange={(value) => handleToggle('hapticFeedbackEnabled', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              accessibilityLabel={copy.hapticAccessibilityLabel}
              accessibilityHint={copy.hapticAccessibilityHint}
              testID="toggle-haptic"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
              <Waves color={Colors.primary} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.categorySignaturesTitle}</Text>
              <Text style={styles.settingDescription}>{copy.categorySignaturesDescription}</Text>
            </View>
            <Switch
              value={settings.hapticCategorySignatures}
              onValueChange={(value) => handleToggle('hapticCategorySignatures', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              accessibilityLabel={copy.categorySignaturesAccessibilityLabel}
              testID="toggle-category-haptics"
            />
          </View>
        </View>

        {settings.hapticFeedbackEnabled ? (
          <View style={styles.demoCard}>
            <View style={styles.demoHeaderRow}>
              <View style={styles.demoHeaderText}>
                <Text style={styles.demoTitle}>{copy.demoTitle}</Text>
                <Text style={styles.demoSubtitle}>{copy.demoSubtitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.testHapticBtn}
                onPress={handleTestHaptic}
                accessibilityRole="button"
                accessibilityLabel={copy.testHapticButton}
                accessibilityHint={copy.testHapticHint}
                testID="test-strong-haptic"
              >
                <Zap color={Colors.white} size={16} />
                <Text style={styles.testHapticText}>{copy.testHapticButton}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hapticNote}>{copy.hapticDeviceNote}</Text>
            <View style={styles.demoGrid}>
              {demoPatterns.map((item) => (
                <TouchableOpacity
                  key={item.pattern}
                  style={styles.demoBtn}
                  onPress={() => handleDemoHaptic(item.pattern)}
                  accessibilityLabel={copy.demoAccessibilityLabel.replace('{label}', item.label)}
                  accessibilityHint={HAPTIC_PATTERN_DESCRIPTIONS[item.pattern]}
                  testID={'demo-haptic-' + item.pattern}
                >
                  <Text style={styles.demoBtnText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle}>{copy.sectionVisual}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
              <Eye color={Colors.primary} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.highContrastTitle}</Text>
              <Text style={styles.settingDescription}>{copy.highContrastDescription}</Text>
            </View>
            <Switch
              value={settings.highContrastMode}
              onValueChange={(value) => handleToggle('highContrastMode', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              accessibilityLabel={copy.highContrastAccessibilityLabel}
              testID="toggle-high-contrast"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.textSizeBlock}>
            <View style={styles.textSizeHeaderRow}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
                <Type color={Colors.primary} size={18} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{copy.textSizeTitle}</Text>
                <Text style={styles.settingDescription}>
                  {copy.textSizeDescription.replace('{size}', selectedTextSizeOption.label)}
                </Text>
              </View>
            </View>

            <View style={styles.textSizeGrid}>
              {ACCESSIBILITY_TEXT_SIZE_OPTIONS.map((option) => {
                const isSelected = settings.textSizeLevel === option.level;
                return (
                  <TouchableOpacity
                    key={option.level}
                    style={[styles.textSizeOption, isSelected ? styles.textSizeOptionSelected : null]}
                    onPress={() => handleTextSizeSelect(option.level)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={copy.textSizeAccessibilityLabel.replace('{size}', option.label)}
                    testID={'text-size-' + option.level}
                  >
                    <Text style={[styles.textSizeOptionShort, isSelected ? styles.textSizeOptionShortSelected : null]}>
                      {option.shortLabel}
                    </Text>
                    <Text style={[styles.textSizeOptionLabel, isSelected ? styles.textSizeOptionLabelSelected : null]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.textSizeOptionMeta, isSelected ? styles.textSizeOptionMetaSelected : null]}>
                      {Math.round(option.scale * 100)}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewEyebrow}>{copy.previewTitle}</Text>
              <Text style={styles.previewTitle}>My Records My Health</Text>
              <Text style={styles.previewBody}>{copy.previewBody}</Text>
              <Text style={styles.previewMeta}>
                {copy.previewMeta
                  .replace('{size}', selectedTextSizeOption.label)
                  .replace('{percent}', String(Math.round(selectedTextSizeOption.scale * 100)))}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle}>{copy.sectionScreenReader}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
              <Volume2 color={Colors.primary} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.announcementsTitle}</Text>
              <Text style={styles.settingDescription}>{copy.announcementsDescription}</Text>
            </View>
            <Switch
              value={settings.screenReaderAnnouncements}
              onValueChange={(value) => handleToggle('screenReaderAnnouncements', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              accessibilityLabel={copy.announcementsAccessibilityLabel}
              testID="toggle-announcements"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
              <Hand color={Colors.primary} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.reducedMotionTitle}</Text>
              <Text style={styles.settingDescription}>{copy.reducedMotionDescription}</Text>
            </View>
            <Switch
              value={settings.reducedMotion}
              onValueChange={(value) => handleToggle('reducedMotion', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              accessibilityLabel={copy.reducedMotionAccessibilityLabel}
              testID="toggle-reduced-motion"
            />
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Info color={Colors.primary} size={16} />
        <Text style={styles.infoText}>{copy.infoText}</Text>
      </View>

      <TouchableOpacity
        style={styles.resetBtn}
        onPress={handleReset}
        accessibilityLabel={copy.resetAccessibilityLabel}
        testID="reset-accessibility"
      >
        <RotateCcw color={Colors.textSecondary} size={16} />
        <Text style={styles.resetBtnText}>{copy.resetButton}</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  headerCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.primaryDark,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionGroup: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 62,
  },
  demoCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  demoHeaderText: {
    flex: 1,
    gap: 4,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  demoSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  testHapticBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 150,
  },
  testHapticText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  hapticNote: {
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 17,
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  demoBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  textSizeBlock: {
    padding: 14,
    gap: 14,
  },
  textSizeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textSizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  textSizeOption: {
    flexGrow: 1,
    minWidth: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 4,
  },
  textSizeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  textSizeOptionShort: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  textSizeOptionShortSelected: {
    color: Colors.white,
  },
  textSizeOptionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  textSizeOptionLabelSelected: {
    color: Colors.white,
  },
  textSizeOptionMeta: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  textSizeOptionMetaSelected: {
    color: Colors.primaryLight,
  },
  previewCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 7,
  },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 1,
    color: Colors.primary,
    textTransform: 'uppercase' as const,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.primaryDark,
  },
  previewBody: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  previewMeta: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primaryDark,
    lineHeight: 18,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
