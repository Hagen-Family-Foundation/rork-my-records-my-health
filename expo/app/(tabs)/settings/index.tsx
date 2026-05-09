import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ScaledText';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileSearch,
  ShieldCheck,
  Trash2,
  ChevronRight,
  Lock,
  Eye,
  Heart,
  AlertTriangle,
  ScanLine,
  Search,
  Accessibility,
  Fingerprint,
  CreditCard,
  Database,
  Shield,
  FileCheck,
  Languages,
  Mail,
  LogOut,
  FileText,
  ExternalLink,
  Share2,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import APP_CONFIG from '@/constants/appConfig';
import { interpolate, usePhraseSet } from '@/localization/runtime';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { useLocalization } from '@/providers/LocalizationProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useCommunications } from '@/providers/CommunicationsProvider';
import { useStartupLegal } from '@/providers/StartupLegalProvider';
import { useSecurity } from '@/providers/SecurityProvider';
import { triggerHaptic } from '@/utils/haptics';
import {
  SUPPORT_EMAIL,
  buildCommunicationsPreferenceEmail,
  buildGeneralSupportEmail,
  openSupportEmail,
} from '@/utils/support';
import { PRIVACY_POLICY_URL, openPrivacyPolicy } from '@/utils/privacy';

export default function SettingsScreen() {
  const { auditLog, record, resetAllData } = useHealthRecords();
  const { currentLanguage, t } = useLocalization();
  const { isSigningOut, signOut, user } = useAuth();
  const {
    preferences,
    setMarketingEmailsEnabled,
    resetPreferences,
    isSaving: isSavingCommunications,
  } = useCommunications();
  const {
    preferences: startupLegalPreferences,
    setPrivacyStartupEnabled,
    setDisclaimerStartupEnabled,
    isSaving: isSavingStartupLegal,
  } = useStartupLegal();
  const {
    settings: securitySettings,
    updateSetting: updateSecuritySetting,
    isLoading: isSecurityLoading,
  } = useSecurity();
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const showInternalReviewTools = __DEV__;
  const copy = usePhraseSet({
    resetAlertTitle: 'Delete All Data',
    resetAlertMessage:
      'This will permanently wipe the entire app clean — all health records, audit log, onboarding data, and encryption keys. This cannot be undone.',
    cancelButton: 'Cancel',
    deleteEverythingButton: 'Delete Everything',
    dataDeletedTitle: 'Data Deleted',
    dataDeletedMessage:
      'The app has been completely wiped clean. All records, audit log, and settings have been removed.',
    errorTitle: 'Error',
    errorDeleteMessage: 'Failed to delete data',
    searchAccessibilityLabel: 'Search all records',
    searchAccessibilityHint: 'Find medications, allergies, conditions, and more',
    searchSubtitle: 'Find anything across all your health data',
    walletAccessibilityLabel: 'Emergency wallet card',
    walletAccessibilityHint: 'View a screenshot-friendly emergency summary card',
    walletSubtitle: 'Screenshot-friendly summary for your wallet',
    manualAccessibilityLabel: 'User manual',
    manualAccessibilityHint: 'Open the branded onboarding flow and operating instructions guide',
    manualTitle: 'User Manual',
    manualSubtitle: 'Branded onboarding flow and step-by-step operating guide',
    securityAccessibilityLabel: 'Security settings',
    securityAccessibilityHint: 'Configure biometric unlock and auto-lock',
    securitySubtitle: 'Biometric unlock, auto-lock, screenshot protection',
    scannerAccessibilityLabel: 'Scan barcode or QR code',
    scannerAccessibilityHint: 'Import medication data from barcodes',
    scannerSubtitle: 'Import medication data from barcodes',
    auditAccessibilityLabel: 'Audit log, {count} entries',
    auditAccessibilityHint: 'View a log of all record access and changes',
    auditSubtitle: '{count} entries recorded',
    accessibilityAccessibilityLabel: 'Accessibility preferences',
    accessibilityAccessibilityHint:
      'Configure haptic feedback, contrast, text size, and screen reader options',
    accessibilitySubtitle: 'Haptics, contrast, text size, screen reader',
    integrityAccessibilityLabel: 'Data integrity check',
    integrityAccessibilityHint: 'Verify encryption, data structure, and audit log integrity',
    integrityTitle: 'Data Integrity Check',
    integritySubtitle: 'Verify encryption and data health',
    encryptionTitle: 'AES-256-GCM Encrypted Storage',
    encryptionSubtitle:
      'Health data encrypted with AES-256-GCM (authenticated encryption). Key secured in OS Keychain/Keystore via @noble/ciphers.',
    noDataSalesTitle: 'No Data Sales',
    noDataSalesSubtitle: 'We never sell or broker your health data',
    noAdsTitle: 'No Advertising',
    noAdsSubtitle: 'Zero ads, zero tracking, zero hidden monetization',
    internalPrepGroup: 'INTERNAL SUBMISSION PREP',
    internalReviewAccessibilityLabel: 'Internal review checklist',
    internalReviewAccessibilityHint:
      'Open the private Apple and Microsoft submission checklist used during development',
    internalReviewTitle: 'Internal Review Checklist',
    internalReviewSubtitle: 'Private Apple & Microsoft prep tools',
    resetAccessibilityLabel: 'Reset all data',
    resetAccessibilityHint: 'Permanently delete all records, audit log, and encryption keys',
    resetSubtitle: 'Permanently delete all records',
    aboutSubtitle: 'A {brand} product',
    aboutDescription: 'Patient-controlled emergency health records.\nYour body. Your records. Your health.',
    aboutEncrypted: 'Encrypted',
    aboutNoAds: 'No Ads',
    aboutNoDataSales: 'No Data Sales',
    versionLabel: 'Version {version}',
    clinicalTitle: 'Clinical Disclaimer',
    clinicalTextOne:
      'MyRecordsMyHealth is a patient-controlled record-keeping and emergency information tool. It does not provide medical advice, diagnosis, or treatment recommendations.',
    clinicalTextTwo:
      'Always seek the advice of your physician or other qualified health provider with any questions regarding a medical condition, medication changes, or treatment decisions.',
    clinicalTextThree:
      'Information in this app is user-provided unless explicitly labeled with its source. This app does not guarantee accuracy of records or emergency outcomes.',
    accountGroup: 'ACCOUNT',
    accountTitle: 'Email/Password Account Access',
    accountSignedInSubtitle: 'Signed in with email/password access',
    accountSignInDetail: 'The sign-in page uses email and password. PIN or Face ID can be added separately in Security.',
    communicationsGroup: 'STAY CONNECTED',
    communicationsTitle: 'Email Updates & Notices',
    communicationsOffSubtitle: 'Turn this on to open a ready-to-send email asking to join our updates list.',
    communicationsOnSubtitle: 'You are marked in-app for updates. We will open a ready-to-send email if you change this setting.',
    communicationsHelper: 'This app can prepare the email for you, but your device still asks you to send it.',
    communicationsToggleLabel: 'Toggle product update emails',
    supportTitle: 'Reach Out to Our Team',
    supportSubtitle: 'Email us directly at {email}',
    supportAccessibilityLabel: 'Contact support by email',
    supportAccessibilityHint: 'Opens your email app with a message addressed to support',
    supportEmailOpenedTitle: 'Email Ready',
    supportEmailOpenedMessage: 'Your email app opened with a ready-to-send message to our team.',
    supportEmailOpenFailedMessage: 'Could not open your email app right now.',
    communicationsEnabledTitle: 'Updates Enabled',
    communicationsEnabledMessage: 'Your email app opened with a ready-to-send opt-in request. Please tap send to finish joining the list.',
    communicationsDisabledTitle: 'Updates Disabled',
    communicationsDisabledMessage: 'Your email app opened with a ready-to-send opt-out request. Please tap send to finish the change.',
    communicationsSaveFailedMessage: 'We could not update your communication preference right now.',
    signOutTitle: 'Sign Out',
    signOutMessage: 'Sign out of this account on this device?',
    signOutButton: 'Sign Out',
    signOutSubtitle: 'End this session on this device',
    signOutErrorMessage: 'Unable to sign out right now.',
    signedInAsPrefix: 'Signed in as ',
    privacyPolicyTitle: 'Privacy Policy',
    privacyPolicySubtitle: 'Read the full public privacy policy',
    privacyPolicyOpenFailed: 'Could not open the privacy policy right now.',
    privacyStartupTitle: 'Show Privacy Policy on App Open',
    privacyStartupSubtitle: 'Turn off after acknowledgement to bypass it unless opened from Settings.',
    disclaimerStartupTitle: 'Show Disclaimer on App Open',
    disclaimerStartupSubtitle: 'Turn off after acceptance to bypass it unless reviewing Settings.',
    legalStartupSaveFailed: 'Could not update the startup legal preference right now.',
    documentShareReminderTitle: 'Medical File Sharing Reminder',
    documentShareReminderSubtitle:
      'Show a privacy confirmation before an actual saved medical document leaves the app through share or email.',
    documentShareReminderToggleLabel: 'Toggle medical file sharing reminder',
  });

  const handleResetData = useCallback(() => {
    void triggerHaptic('warning');
    Alert.alert(copy.resetAlertTitle, copy.resetAlertMessage, [
      { text: copy.cancelButton, style: 'cancel' },
      {
        text: copy.deleteEverythingButton,
        style: 'destructive',
        onPress: async () => {
          setIsResetting(true);
          try {
            await Promise.all([resetAllData(), resetPreferences()]);
            void triggerHaptic('success');
            console.log('[Settings] Full wipe complete via provider resetAllData');
            Alert.alert(copy.dataDeletedTitle, copy.dataDeletedMessage);
          } catch (error) {
            void triggerHaptic('error');
            console.error('[Settings] Reset failed:', error);
            Alert.alert(copy.errorTitle, copy.errorDeleteMessage);
          } finally {
            setIsResetting(false);
          }
        },
      },
    ]);
  }, [
    copy.cancelButton,
    copy.dataDeletedMessage,
    copy.dataDeletedTitle,
    copy.deleteEverythingButton,
    copy.errorDeleteMessage,
    copy.errorTitle,
    copy.resetAlertMessage,
    copy.resetAlertTitle,
    resetAllData,
    resetPreferences,
  ]);

  const handleNav = useCallback((route: string) => {
    void triggerHaptic('navigate');
    router.push(route as never);
  }, []);

  const handlePrivacyPolicy = useCallback(async () => {
    void triggerHaptic('navigate');
    const opened = await openPrivacyPolicy();
    if (!opened) {
      Alert.alert(copy.errorTitle, copy.privacyPolicyOpenFailed);
    }
  }, [copy.errorTitle, copy.privacyPolicyOpenFailed]);

  const handleLegalStartupToggle = useCallback(
    async (kind: 'privacy' | 'disclaimer', enabled: boolean) => {
      void triggerHaptic('toggle');

      try {
        if (kind === 'privacy') {
          await setPrivacyStartupEnabled(enabled);
          return;
        }

        await setDisclaimerStartupEnabled(enabled);
      } catch (error) {
        console.error('[Settings] Failed to update startup legal preference:', error);
        Alert.alert(copy.errorTitle, copy.legalStartupSaveFailed);
      }
    },
    [copy.errorTitle, copy.legalStartupSaveFailed, setDisclaimerStartupEnabled, setPrivacyStartupEnabled]
  );

  const handleSignOut = useCallback(() => {
    void triggerHaptic('warning');
    Alert.alert(copy.signOutTitle, copy.signOutMessage, [
      { text: copy.cancelButton, style: 'cancel' },
      {
        text: copy.signOutButton,
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            console.log('[Settings] Sign out completed for user:', user?.email ?? 'unknown');
          } catch (error) {
            console.error('[Settings] Sign out failed:', error);
            Alert.alert(copy.errorTitle, copy.signOutErrorMessage);
          }
        },
      },
    ]);
  }, [
    copy.cancelButton,
    copy.errorTitle,
    copy.signOutButton,
    copy.signOutErrorMessage,
    copy.signOutMessage,
    copy.signOutTitle,
    signOut,
    user?.email,
  ]);

  const auditEntryCount = auditLog.length;
  const accountTitle = user?.email ? copy.accountSignedInSubtitle : copy.accountTitle;
  const accountDetail = user?.email ? copy.signedInAsPrefix + user.email : copy.accountSignInDetail;
  const userMetadataFullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

  const contactIdentity = useMemo(() => {
    const fullName = [record.personalInfo.firstName.trim(), record.personalInfo.lastName.trim()]
      .filter(Boolean)
      .join(' ');

    return {
      email: user?.email ?? null,
      fullName: fullName || userMetadataFullName.trim() || null,
    };
  }, [record.personalInfo.firstName, record.personalInfo.lastName, user?.email, userMetadataFullName]);

  const communicationsSubtitle = preferences.marketingEmailsEnabled
    ? copy.communicationsOnSubtitle
    : copy.communicationsOffSubtitle;

  const handleSupportEmail = useCallback(async () => {
    void triggerHaptic('navigate');
    const opened = await openSupportEmail(buildGeneralSupportEmail(contactIdentity));

    if (opened) {
      Alert.alert(copy.supportEmailOpenedTitle, copy.supportEmailOpenedMessage);
      return;
    }

    Alert.alert(copy.errorTitle, copy.supportEmailOpenFailedMessage);
  }, [contactIdentity, copy.errorTitle, copy.supportEmailOpenFailedMessage, copy.supportEmailOpenedMessage, copy.supportEmailOpenedTitle]);

  const handleCommunicationToggle = useCallback(
    async (value: boolean) => {
      void triggerHaptic('toggle');

      try {
        await setMarketingEmailsEnabled(value);
        const opened = await openSupportEmail(buildCommunicationsPreferenceEmail(contactIdentity, value));

        if (!opened) {
          Alert.alert(copy.errorTitle, copy.supportEmailOpenFailedMessage);
          return;
        }

        Alert.alert(
          value ? copy.communicationsEnabledTitle : copy.communicationsDisabledTitle,
          value ? copy.communicationsEnabledMessage : copy.communicationsDisabledMessage
        );
      } catch (error) {
        console.error('[Settings] Failed to update communications preference:', error);
        Alert.alert(copy.errorTitle, copy.communicationsSaveFailedMessage);
      }
    },
    [
      contactIdentity,
      copy.communicationsDisabledMessage,
      copy.communicationsDisabledTitle,
      copy.communicationsEnabledMessage,
      copy.communicationsEnabledTitle,
      copy.communicationsSaveFailedMessage,
      copy.errorTitle,
      copy.supportEmailOpenFailedMessage,
      setMarketingEmailsEnabled,
    ]
  );

  const handleDocumentShareReminderToggle = useCallback(
    (value: boolean) => {
      updateSecuritySetting('documentShareReminderEnabled', value);
      void triggerHaptic('toggle');
    },
    [updateSecuritySetting]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {copy.accountGroup}
        </Text>
        <View style={styles.card}>
          <View style={styles.infoItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <Mail color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{accountTitle}</Text>
              <Text style={styles.menuSubtitle}>{accountDetail}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSignOut}
            disabled={isSigningOut}
            accessibilityLabel={copy.signOutButton}
            accessibilityHint={copy.signOutSubtitle}
            testID="settings-sign-out"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.warningLight }]}>
              <LogOut color={Colors.warning} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.signOutButton}</Text>
              <Text style={styles.menuSubtitle}>{copy.signOutSubtitle}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {copy.communicationsGroup}
        </Text>
        <View style={styles.card}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.warningLight }]}>
              <Mail color={Colors.warning} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.communicationsTitle}</Text>
              <Text style={styles.menuSubtitle}>{communicationsSubtitle}</Text>
            </View>
            <Switch
              value={preferences.marketingEmailsEnabled}
              onValueChange={(value) => {
                void handleCommunicationToggle(value);
              }}
              trackColor={{ false: Colors.border, true: Colors.warning }}
              thumbColor={Colors.white}
              disabled={isSavingCommunications}
              accessibilityLabel={copy.communicationsToggleLabel}
              testID="settings-communications-toggle"
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              void handleSupportEmail();
            }}
            accessibilityLabel={copy.supportAccessibilityLabel}
            accessibilityHint={copy.supportAccessibilityHint}
            testID="settings-contact-support"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <Mail color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.supportTitle}</Text>
              <Text style={styles.menuSubtitle}>{interpolate(copy.supportSubtitle, { email: SUPPORT_EMAIL })}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>
        <Text style={styles.helperNote}>{copy.communicationsHelper}</Text>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {t('settings.quickActions').toUpperCase()}
        </Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/search')}
            accessibilityLabel={copy.searchAccessibilityLabel}
            accessibilityHint={copy.searchAccessibilityHint}
            testID="settings-search"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <Search color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('settings.searchRecords')}</Text>
              <Text style={styles.menuSubtitle}>{copy.searchSubtitle}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/wallet-card')}
            accessibilityLabel={copy.walletAccessibilityLabel}
            accessibilityHint={copy.walletAccessibilityHint}
            testID="settings-wallet-card"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.emergencyLight }]}>
              <CreditCard color={Colors.emergency} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('settings.walletCard')}</Text>
              <Text style={styles.menuSubtitle}>{copy.walletSubtitle}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/user-manual')}
            accessibilityLabel={copy.manualAccessibilityLabel}
            accessibilityHint={copy.manualAccessibilityHint}
            testID="settings-user-manual"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <FileText color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.manualTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.manualSubtitle}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {t('settings.securityAccess').toUpperCase()}
        </Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/security-settings')}
            accessibilityLabel={copy.securityAccessibilityLabel}
            accessibilityHint={copy.securityAccessibilityHint}
            testID="settings-security"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.verifiedLight }]}>
              <Fingerprint color={Colors.verified} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('settings.security')}</Text>
              <Text style={styles.menuSubtitle}>{copy.securitySubtitle}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/scanner')}
            accessibilityLabel={copy.scannerAccessibilityLabel}
            accessibilityHint={copy.scannerAccessibilityHint}
            testID="settings-scanner"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <ScanLine color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('settings.scanner')}</Text>
              <Text style={styles.menuSubtitle}>{copy.scannerSubtitle}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/audit-log')}
            accessibilityLabel={interpolate(copy.auditAccessibilityLabel, { count: auditEntryCount })}
            accessibilityHint={copy.auditAccessibilityHint}
            testID="settings-audit-log"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <FileSearch color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('settings.auditLog')}</Text>
              <Text style={styles.menuSubtitle}>{interpolate(copy.auditSubtitle, { count: auditEntryCount })}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {t('settings.accessibilityGroup').toUpperCase()}
        </Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/accessibility-settings')}
            accessibilityLabel={copy.accessibilityAccessibilityLabel}
            accessibilityHint={copy.accessibilityAccessibilityHint}
            testID="settings-accessibility"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <Accessibility color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('settings.accessibilityItem')}</Text>
              <Text style={styles.menuSubtitle}>{copy.accessibilitySubtitle}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/language-settings')}
            accessibilityLabel={t('settings.language')}
            accessibilityHint={t('settings.languageSubtitle')}
            testID="settings-language"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <Languages color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('settings.language')}</Text>
              <Text style={styles.menuSubtitle}>{currentLanguage.nativeName}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {t('settings.privacyEncryption').toUpperCase()}
        </Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNav('/integrity-check')}
            accessibilityLabel={copy.integrityAccessibilityLabel}
            accessibilityHint={copy.integrityAccessibilityHint}
            testID="settings-integrity"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.verifiedLight }]}>
              <Database color={Colors.verified} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.integrityTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.integritySubtitle}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.verifiedLight }]}>
              <Lock color={Colors.verified} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.encryptionTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.encryptionSubtitle}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.verifiedLight }]}>
              <ShieldCheck color={Colors.verified} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.noDataSalesTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.noDataSalesSubtitle}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.verifiedLight }]}>
              <Eye color={Colors.verified} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.noAdsTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.noAdsSubtitle}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { void handlePrivacyPolicy(); }}
            accessibilityLabel={copy.privacyPolicyTitle}
            accessibilityHint={copy.privacyPolicySubtitle}
            testID="settings-privacy-policy"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}>
              <FileText color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.privacyPolicyTitle}</Text>
              <Text style={styles.menuSubtitle} numberOfLines={1}>{PRIVACY_POLICY_URL.replace('https://', '')}</Text>
            </View>
            <ExternalLink color={Colors.textTertiary} size={16} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.warningLight }]}> 
              <Share2 color={Colors.warning} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.documentShareReminderTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.documentShareReminderSubtitle}</Text>
            </View>
            <Switch
              value={securitySettings.documentShareReminderEnabled}
              onValueChange={handleDocumentShareReminderToggle}
              trackColor={{ false: Colors.border, true: Colors.warning }}
              thumbColor={Colors.white}
              disabled={isSecurityLoading}
              accessibilityLabel={copy.documentShareReminderToggleLabel}
              testID="settings-document-share-reminder-toggle"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.primaryLight }]}> 
              <FileText color={Colors.primary} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.privacyStartupTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.privacyStartupSubtitle}</Text>
            </View>
            <Switch
              value={startupLegalPreferences.showPrivacyOnStartup}
              onValueChange={(value) => {
                void handleLegalStartupToggle('privacy', value);
              }}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              disabled={isSavingStartupLegal}
              accessibilityLabel={copy.privacyStartupTitle}
              testID="settings-privacy-startup-toggle"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.warningLight }]}> 
              <AlertTriangle color={Colors.warning} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{copy.disclaimerStartupTitle}</Text>
              <Text style={styles.menuSubtitle}>{copy.disclaimerStartupSubtitle}</Text>
            </View>
            <Switch
              value={startupLegalPreferences.showDisclaimerOnStartup}
              onValueChange={(value) => {
                void handleLegalStartupToggle('disclaimer', value);
              }}
              trackColor={{ false: Colors.border, true: Colors.warning }}
              thumbColor={Colors.white}
              disabled={isSavingStartupLegal}
              accessibilityLabel={copy.disclaimerStartupTitle}
              testID="settings-disclaimer-startup-toggle"
            />
          </View>
        </View>
      </View>

      {showInternalReviewTools ? (
        <View style={styles.sectionGroup}>
          <Text style={styles.groupTitle} accessibilityRole="header">
            {copy.internalPrepGroup}
          </Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNav('/review-readiness')}
              accessibilityLabel={copy.internalReviewAccessibilityLabel}
              accessibilityHint={copy.internalReviewAccessibilityHint}
              testID="settings-review-readiness"
            >
              <View style={[styles.menuIcon, { backgroundColor: Colors.warningLight }]}>
                <FileCheck color={Colors.warning} size={18} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{copy.internalReviewTitle}</Text>
                <Text style={styles.menuSubtitle}>{copy.internalReviewSubtitle}</Text>
              </View>
              <ChevronRight color={Colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {t('settings.dataManagement').toUpperCase()}
        </Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleResetData}
            disabled={isResetting}
            accessibilityLabel={copy.resetAccessibilityLabel}
            accessibilityHint={copy.resetAccessibilityHint}
            testID="settings-reset"
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.emergencyLight }]}>
              <Trash2 color={Colors.emergency} size={18} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: Colors.emergency }]}>{t('settings.resetAllData')}</Text>
              <Text style={styles.menuSubtitle}>{copy.resetSubtitle}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient
        colors={['#1E3A5F', '#2A5080', '#1E3A5F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aboutCard}
      >
        <View style={styles.aboutShieldCircle}>
          <Shield color="#FFFFFF" size={28} />
        </View>
        <Text style={styles.aboutTitle}>{APP_CONFIG.name}</Text>
        <View style={styles.aboutBrandRow}>
          <Heart color="#F87171" size={12} />
          <Text style={styles.aboutSubtitle}>{interpolate(copy.aboutSubtitle, { brand: APP_CONFIG.parentBrand })}</Text>
        </View>
        <View style={styles.aboutDivider} />
        <Text style={styles.aboutDescription}>{copy.aboutDescription}</Text>
        <View style={styles.aboutTrustRow}>
          <View style={styles.aboutTrustChip}>
            <Lock color="#6FD5A6" size={10} />
            <Text style={styles.aboutTrustText}>{copy.aboutEncrypted}</Text>
          </View>
          <View style={styles.aboutTrustChip}>
            <Eye color="#6FD5A6" size={10} />
            <Text style={styles.aboutTrustText}>{copy.aboutNoAds}</Text>
          </View>
          <View style={styles.aboutTrustChip}>
            <ShieldCheck color="#6FD5A6" size={10} />
            <Text style={styles.aboutTrustText}>{copy.aboutNoDataSales}</Text>
          </View>
        </View>
        <Text style={styles.versionText}>{interpolate(copy.versionLabel, { version: APP_CONFIG.version })}</Text>
      </LinearGradient>

      <View style={styles.clinicalCard}>
        <View style={styles.clinicalHeader}>
          <AlertTriangle color={Colors.warning} size={16} />
          <Text style={styles.clinicalTitle}>{copy.clinicalTitle}</Text>
        </View>
        <Text style={styles.clinicalText}>{copy.clinicalTextOne}</Text>
        <Text style={styles.clinicalText}>{copy.clinicalTextTwo}</Text>
        <Text style={styles.clinicalText}>{copy.clinicalTextThree}</Text>
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    gap: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 62,
  },
  aboutCard: {
    alignItems: 'center',
    borderRadius: 18,
    padding: 28,
    gap: 6,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#1E3A5F',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
        }
      : {
          elevation: 8,
        }),
  },
  aboutShieldCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  aboutBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aboutSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600' as const,
  },
  aboutDivider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 8,
  },
  aboutDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  aboutTrustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  aboutTrustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(111,213,166,0.15)',
  },
  aboutTrustText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6FD5A6',
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 10,
  },
  clinicalCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    padding: 16,
    gap: 10,
  },
  clinicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clinicalTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  clinicalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  helperNote: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    paddingHorizontal: 4,
  },
});
