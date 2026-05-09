import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as SMS from 'expo-sms';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import {
  Fingerprint,
  Timer,
  Camera,
  ShieldCheck,
  Info,
  ChevronRight,
  Check,
  MessageSquare,
} from 'lucide-react-native';
import { Text } from '@/components/ScaledText';
import Colors from '@/constants/colors';
import { interpolate, usePhraseSet } from '@/localization/runtime';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { useSecurity, AUTO_LOCK_OPTIONS } from '@/providers/SecurityProvider';
import { triggerHaptic } from '@/utils/haptics';

export default function SecuritySettingsScreen() {
  const { settings, updateSetting, checkBiometricAvailability } = useSecurity();
  const { record } = useHealthRecords();
  const [biometricInfo, setBiometricInfo] = useState<{ available: boolean; biometricType: string }>({
    available: false,
    biometricType: 'Biometric',
  });
  const [showTimeoutPicker, setShowTimeoutPicker] = useState<boolean>(false);
  const [isSmsAvailable, setIsSmsAvailable] = useState<boolean>(false);
  const copy = usePhraseSet({
    headerTitle: 'Security Settings',
    headerSubtitle: 'Protect your health records with biometric authentication, auto-lock, and emergency outreach tools.',
    sectionBiometric: 'BIOMETRIC UNLOCK',
    faceId: 'Face ID',
    fingerprint: 'Fingerprint',
    iris: 'Iris',
    biometric: 'Biometric',
    biometricUnlockTitle: '{type} Unlock',
    biometricUnlockDescription: 'An extra in-app lock layered on top of your phone’s own {type}. Requires {type} to reopen the app after it locks.',
    biometricUnavailableWeb: 'Biometric authentication is not available on web',
    biometricUnavailableDevice: 'No biometric enrollment found on this device',
    biometricToggleLabel: 'Toggle {type} unlock',
    sectionAutoLock: 'AUTO-LOCK',
    autoLockTitle: 'Auto-Lock',
    autoLockDescription: 'Automatically lock the app after a period of inactivity',
    autoLockToggleLabel: 'Toggle auto-lock',
    autoLockTimeoutLabel: 'Auto-lock timeout: {minutes} minutes',
    lockAfterTitle: 'Lock After',
    lockAfterDescription: '{minutes} minutes of inactivity',
    oneMinuteLabel: '{count} minute',
    minutesLabel: '{count} minutes',
    enableBiometricHint: 'Enable biometric unlock first to use auto-lock.',
    sectionEmergencyAlerts: 'EMERGENCY ALERTS',
    textPrimaryContactTitle: 'Text Primary Contact',
    textPrimaryContactDescription:
      'When Emergency View opens, automatically prepare a prefilled SMS to your primary emergency contact and include your approximate location when permission is available. Location access is controlled by the app permission setting on the user’s phone and can be changed in device settings at any time. Your device still requires final send confirmation.',
    textPrimaryContactUnavailable: 'SMS is not available on this device or platform.',
    textPrimaryContactMissingContact: 'Add a primary emergency contact with a phone number to use this feature.',
    textPrimaryContactToggleLabel: 'Toggle automatic text to primary contact from Emergency View',
    sectionScreenshot: 'SCREENSHOT PROTECTION',
    screenshotTitle: 'Screenshot Advisory',
    screenshotDescription:
      'Tip: screenshots of health info can sync to the cloud through your Photos — delete them after use, or move them into a protected/locked photo app on your phone.',
    infoText:
      "Your health records are encrypted with AES-256-GCM. The encryption key is stored in your device's secure hardware (iOS Keychain / Android Keystore). Biometric unlock adds an additional layer of protection — your data never leaves the device.",
  });

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricInfo);
  }, [checkBiometricAvailability]);

  useEffect(() => {
    let isMounted = true;

    SMS.isAvailableAsync()
      .then((available) => {
        if (!isMounted) {
          return;
        }
        setIsSmsAvailable(available);
        console.log('[SecuritySettings] SMS availability:', available);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setIsSmsAvailable(false);
        console.error('[SecuritySettings] Failed to check SMS availability:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const biometricTypeLabel = useMemo(() => {
    switch (biometricInfo.biometricType) {
      case 'Face ID':
        return copy.faceId;
      case 'Fingerprint':
        return copy.fingerprint;
      case 'Iris':
        return copy.iris;
      default:
        return copy.biometric;
    }
  }, [biometricInfo.biometricType, copy.biometric, copy.faceId, copy.fingerprint, copy.iris]);

  const hasPrimaryContactWithPhone = useMemo(() => {
    return record.emergencyContacts.some((contact) => contact.isPrimary && contact.phone.trim().length > 0);
  }, [record.emergencyContacts]);

  const getTimeoutLabel = useCallback(
    (minutes: number) =>
      minutes === 1
        ? interpolate(copy.oneMinuteLabel, { count: minutes })
        : interpolate(copy.minutesLabel, { count: minutes }),
    [copy.minutesLabel, copy.oneMinuteLabel]
  );

  const emergencyTextDescription = useMemo(() => {
    if (!isSmsAvailable) {
      return copy.textPrimaryContactUnavailable;
    }

    if (!hasPrimaryContactWithPhone) {
      return copy.textPrimaryContactMissingContact;
    }

    return copy.textPrimaryContactDescription;
  }, [
    copy.textPrimaryContactDescription,
    copy.textPrimaryContactMissingContact,
    copy.textPrimaryContactUnavailable,
    hasPrimaryContactWithPhone,
    isSmsAvailable,
  ]);

  const emergencyTextToggleDisabled = useMemo(() => {
    return !settings.emergencyTextPrimaryContactEnabled && (!isSmsAvailable || !hasPrimaryContactWithPhone);
  }, [hasPrimaryContactWithPhone, isSmsAvailable, settings.emergencyTextPrimaryContactEnabled]);

  const handleBiometricToggle = useCallback(
    (value: boolean) => {
      updateSetting('biometricEnabled', value);
      void triggerHaptic('toggle');
    },
    [updateSetting]
  );

  const handleAutoLockToggle = useCallback(
    (value: boolean) => {
      updateSetting('autoLockEnabled', value);
      void triggerHaptic('toggle');
    },
    [updateSetting]
  );

  const handleTimeoutSelect = useCallback(
    (minutes: number) => {
      updateSetting('autoLockTimeoutMinutes', minutes);
      setShowTimeoutPicker(false);
      void triggerHaptic('select');
    },
    [updateSetting]
  );

  const handleEmergencyTextToggle = useCallback(
    (value: boolean) => {
      updateSetting('emergencyTextPrimaryContactEnabled', value);
      void triggerHaptic('toggle');
    },
    [updateSetting]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <ShieldCheck color={Colors.verified} size={24} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          {copy.headerTitle}
        </Text>
        <Text style={styles.headerSubtitle}>{copy.headerSubtitle}</Text>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle}>{copy.sectionBiometric}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
              <Fingerprint color={Colors.primary} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{interpolate(copy.biometricUnlockTitle, { type: biometricTypeLabel })}</Text>
              <Text style={styles.settingDescription}>
                {biometricInfo.available
                  ? interpolate(copy.biometricUnlockDescription, { type: biometricTypeLabel })
                  : Platform.OS === 'web'
                    ? copy.biometricUnavailableWeb
                    : copy.biometricUnavailableDevice}
              </Text>
            </View>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              disabled={!biometricInfo.available}
              accessibilityLabel={interpolate(copy.biometricToggleLabel, { type: biometricTypeLabel })}
              testID="toggle-biometric"
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle}>{copy.sectionAutoLock}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
              <Timer color={Colors.primary} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.autoLockTitle}</Text>
              <Text style={styles.settingDescription}>{copy.autoLockDescription}</Text>
            </View>
            <Switch
              value={settings.autoLockEnabled}
              onValueChange={handleAutoLockToggle}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              disabled={!settings.biometricEnabled}
              accessibilityLabel={copy.autoLockToggleLabel}
              testID="toggle-auto-lock"
            />
          </View>

          {settings.autoLockEnabled && settings.biometricEnabled ? (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  setShowTimeoutPicker(!showTimeoutPicker);
                  void triggerHaptic('select');
                }}
                accessibilityLabel={interpolate(copy.autoLockTimeoutLabel, {
                  minutes: settings.autoLockTimeoutMinutes,
                })}
                testID="auto-lock-timeout"
              >
                <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}> 
                  <Timer color={Colors.primary} size={18} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{copy.lockAfterTitle}</Text>
                  <Text style={styles.settingDescription}>
                    {interpolate(copy.lockAfterDescription, {
                      minutes: settings.autoLockTimeoutMinutes,
                    })}
                  </Text>
                </View>
                <ChevronRight color={Colors.textTertiary} size={18} />
              </TouchableOpacity>

              {showTimeoutPicker ? (
                <View style={styles.pickerContainer}>
                  {AUTO_LOCK_OPTIONS.map((option) => {
                    const optionLabel = getTimeoutLabel(option.value);
                    const isSelected = settings.autoLockTimeoutMinutes === option.value;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.pickerOption, isSelected ? styles.pickerOptionActive : undefined]}
                        onPress={() => handleTimeoutSelect(option.value)}
                        accessibilityLabel={optionLabel}
                        accessibilityState={{ selected: isSelected }}
                        testID={'timeout-' + option.value}
                      >
                        <Text style={[styles.pickerOptionText, isSelected ? styles.pickerOptionTextActive : undefined]}>
                          {optionLabel}
                        </Text>
                        {isSelected ? <Check color={Colors.primary} size={16} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {!settings.biometricEnabled && !biometricInfo.available ? null : !settings.biometricEnabled ? (
          <View style={styles.hintCard}>
            <Info color={Colors.textTertiary} size={14} />
            <Text style={styles.hintText}>{copy.enableBiometricHint}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle}>{copy.sectionEmergencyAlerts}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.emergencyLight }]}> 
              <MessageSquare color={Colors.emergency} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.textPrimaryContactTitle}</Text>
              <Text style={styles.settingDescription}>{emergencyTextDescription}</Text>
            </View>
            <Switch
              value={settings.emergencyTextPrimaryContactEnabled}
              onValueChange={handleEmergencyTextToggle}
              trackColor={{ false: Colors.border, true: Colors.emergency }}
              thumbColor={Colors.white}
              disabled={emergencyTextToggleDisabled}
              accessibilityLabel={copy.textPrimaryContactToggleLabel}
              testID="toggle-emergency-text-primary"
            />
          </View>
        </View>

        {settings.emergencyTextPrimaryContactEnabled && !hasPrimaryContactWithPhone ? (
          <View style={styles.hintCard}>
            <Info color={Colors.textTertiary} size={14} />
            <Text style={styles.hintText}>{copy.textPrimaryContactMissingContact}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle}>{copy.sectionScreenshot}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.warningLight }]}> 
              <Camera color={Colors.warning} size={18} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{copy.screenshotTitle}</Text>
              <Text style={styles.settingDescription}>{copy.screenshotDescription}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <ShieldCheck color={Colors.verified} size={16} />
        <Text style={styles.infoText}>{copy.infoText}</Text>
      </View>

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
    backgroundColor: Colors.verifiedLight,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.verified,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#065F46',
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
  infoRow: {
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
  pickerContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    padding: 8,
    gap: 2,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  pickerOptionActive: {
    backgroundColor: Colors.primaryLight,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  pickerOptionTextActive: {
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textTertiary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.verifiedLight,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 18,
  },
});
