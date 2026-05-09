import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldPlus,
  Heart,
  ChevronRight,
  Droplets,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  Eye,
  FileText,
  Camera,
  Files,
} from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { useLocalization } from '@/providers/LocalizationProvider';
import { usePhraseSet } from '@/localization/runtime';
import Colors from '@/constants/colors';
import { BLOOD_TYPES } from '@/types/health';
import { formatPhoneNumber } from '@/utils/format';

type OnboardingStep = 'welcome' | 'setup';

const STEPS: OnboardingStep[] = ['welcome', 'setup'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding, updatePersonalInfo, updateEmergencyContacts, record } = useHealthRecords();
  const { currentLanguage, t } = useLocalization();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [bloodType, setBloodType] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactRelationship, setContactRelationship] = useState<string>('');

  const copy = usePhraseSet({
    brandSubtitle: 'A MyBodyIsMyHealth.com product',
    missionText:
      'Your emergency medical records, always with you. Controlled by you. Designed to help medical professionals help you — fast, and built to be easier to use across a wide range of vision and accessibility needs.',
    backupTitle: 'Smart backup idea',
    backupText:
      'After setup, open Emergency View and tap Print Emergency Card to create a wallet-sized emergency card for your wallet, bag, or glove box. If AirPrint does not find a printer, save or share the PDF to Files, AirDrop, email, or your printer app and print from there. Consider placing a small reminder sticker near the driver door lock or lower-left windshield so first responders know medical information is available. The personal details you enter carry through exactly as written, so you can keep your records in the language you choose.',
    featureSecureTitle: 'Secure Storage',
    featureSecureDescription: 'AES-256 encrypted health information',
    featureEmergencyTitle: 'Emergency View',
    featureEmergencyDescription: 'One-tap access for first responders',
    featureShareTitle: 'Print & Share',
    featureShareDescription: 'Printed emergency cards and exports keep the details you entered',
    featureBiometricTitle: 'In-App Biometric Lock',
    featureBiometricDescription: 'A second lock layer inside the app — on top of your phone’s own Face ID or fingerprint.',
    featureSnapTitle: 'Snap Any Medical Doc',
    featureSnapDescription:
      'Lab results, Rx bottles, insurance cards, DNR, organ donor card — safely stored until needed.',
    snapTagline:
      'Snap a photo of any medical document — lab results, prescription bottles, insurance cards, DNR, organ donor card — safe and sound until you need it.',
    setupSubtitle: 'Get started by entering the basics. You can add more details anytime.',
    contactNamePlaceholder: 'e.g. Jane Doe',
    contactRelationshipPlaceholder: 'e.g. Spouse, Parent',
    contactPhonePlaceholder: '555-555-5555',
    setupHint: 'You can skip any field and fill it in later from the Records tab.',
    defaultRelationship: 'Not specified',
    bloodTypeUnknown: 'Unknown',
  });

  const animateTransition = useCallback(
    (next: number) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(next);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim]
  );

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      animateTransition(currentStep + 1);
    }
  }, [animateTransition, currentStep]);

  const handleFinish = useCallback(async () => {
    if (firstName.trim() || lastName.trim() || bloodType) {
      updatePersonalInfo({
        ...record.personalInfo,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bloodType,
      });
    }

    if (contactName.trim() && contactPhone.trim()) {
      updateEmergencyContacts([
        {
          id: Date.now().toString(36),
          name: contactName.trim(),
          relationship: contactRelationship.trim() || copy.defaultRelationship,
          phone: contactPhone.trim(),
          isPrimary: true,
        },
      ]);
    }

    await completeOnboarding();
    router.replace('/');
  }, [
    bloodType,
    completeOnboarding,
    contactName,
    contactPhone,
    contactRelationship,
    copy.defaultRelationship,
    firstName,
    lastName,
    record.personalInfo,
    updateEmergencyContacts,
    updatePersonalInfo,
  ]);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const shieldPulseAnim = useRef(new Animated.Value(1)).current;
  const welcomeFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(welcomeFadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(shieldPulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(shieldPulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [shieldPulseAnim, welcomeFadeAnim]);

  const renderBloodTypeLabel = useCallback(
    (value: string) => (value === 'Unknown' ? copy.bloodTypeUnknown : value),
    [copy.bloodTypeUnknown]
  );

  const featureItems = useMemo(
    () => [
      {
        title: copy.featureSnapTitle,
        description: copy.featureSnapDescription,
        icon: (
          <View style={styles.snapIconStack}>
            <Files color={Colors.primary} size={14} />
            <Camera color={Colors.primary} size={14} />
          </View>
        ),
        backgroundColor: Colors.primaryLight,
      },
      {
        title: copy.featureSecureTitle,
        description: copy.featureSecureDescription,
        icon: <ShieldCheck color={Colors.primary} size={16} />,
        backgroundColor: Colors.primaryLight,
      },
      {
        title: copy.featureEmergencyTitle,
        description: copy.featureEmergencyDescription,
        icon: <Eye color={Colors.emergency} size={16} />,
        backgroundColor: Colors.emergencyLight,
      },
      {
        title: copy.featureShareTitle,
        description: copy.featureShareDescription,
        icon: <FileText color={Colors.verified} size={16} />,
        backgroundColor: Colors.verifiedLight,
      },
      {
        title: copy.featureBiometricTitle,
        description: copy.featureBiometricDescription,
        icon: <Fingerprint color={Colors.primary} size={16} />,
        backgroundColor: Colors.primaryLight,
      },
    ],
    [
      copy.featureBiometricDescription,
      copy.featureBiometricTitle,
      copy.featureEmergencyDescription,
      copy.featureEmergencyTitle,
      copy.featureSecureDescription,
      copy.featureSecureTitle,
      copy.featureShareDescription,
      copy.featureShareTitle,
      copy.featureSnapDescription,
      copy.featureSnapTitle,
    ]
  );

  const renderWelcome = () => (
    <Animated.View style={[styles.stepContent, { opacity: welcomeFadeAnim }]}> 
      <Animated.View style={[styles.shieldOuter, { transform: [{ scale: shieldPulseAnim }] }]}> 
        <LinearGradient colors={['#1E3A5F', '#2A5080']} style={styles.iconCircle}>
          <ShieldPlus color="#FFFFFF" size={48} />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.welcomeTitle}>MyRecordsMyHealth</Text>
      <View style={styles.brandTagline}>
        <Heart color="#DC2626" size={12} />
        <Text style={styles.welcomeSubtitle}>{copy.brandSubtitle}</Text>
      </View>
      <TouchableOpacity style={styles.languageButton} onPress={() => router.push('/language-settings')} testID="onboarding-language">
        <Text style={styles.languageButtonText}>{String(t('onboarding.appLanguage') + ': ' + currentLanguage.nativeName)}</Text>
      </TouchableOpacity>
      <View style={styles.missionCard}>
        <Text style={styles.missionText}>{copy.missionText}</Text>
      </View>
      <View style={styles.welcomeTipCard}>
        <Text style={styles.welcomeTipTitle}>{copy.backupTitle}</Text>
        <Text style={styles.welcomeTipText}>{copy.backupText}</Text>
      </View>
      <View style={styles.snapCalloutCard}>
        <View style={styles.snapCalloutIcons}>
          <Files color={Colors.primary} size={18} />
          <Camera color={Colors.primary} size={18} />
        </View>
        <Text style={styles.snapCalloutText}>{copy.snapTagline}</Text>
      </View>
      <View style={styles.featureList}>
        {featureItems.map((item) => (
          <View key={item.title} style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: item.backgroundColor }]}>{item.icon}</View>
            <View style={styles.featureTextBlock}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderSetup = () => (
    <ScrollView
      style={styles.setupScroll}
      contentContainerStyle={styles.setupContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepTitle}>{t('onboarding.quickSetup')}</Text>
      <Text style={styles.setupSubtitle}>{copy.setupSubtitle}</Text>
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>{t('onboarding.yourName').toUpperCase()}</Text>
        <View style={styles.setupCard}>
          <View style={styles.setupInputGroup}>
            <Text style={styles.inputLabel}>{t('onboarding.firstName')}</Text>
            <TextInput
              style={styles.setupInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('onboarding.firstName')}
              placeholderTextColor={Colors.textTertiary}
              testID="onboarding-first-name"
            />
          </View>
          <View style={styles.setupDivider} />
          <View style={styles.setupInputGroup}>
            <Text style={styles.inputLabel}>{t('onboarding.lastName')}</Text>
            <TextInput
              style={styles.setupInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('onboarding.lastName')}
              placeholderTextColor={Colors.textTertiary}
              testID="onboarding-last-name"
            />
          </View>
        </View>
      </View>
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>{t('onboarding.bloodType').toUpperCase()}</Text>
        <View style={styles.bloodTypeGrid}>
          {BLOOD_TYPES.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.bloodTypeChip, bloodType === value ? styles.bloodTypeChipActive : undefined]}
              onPress={() => setBloodType(value)}
              testID={String('onboarding-blood-' + value)}
            >
              <Droplets color={bloodType === value ? Colors.white : Colors.emergency} size={13} />
              <Text style={[styles.bloodTypeText, bloodType === value ? styles.bloodTypeTextActive : undefined]}>
                {renderBloodTypeLabel(value)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>{t('onboarding.primaryEmergencyContact').toUpperCase()}</Text>
        <View style={styles.setupCard}>
          <View style={styles.setupInputGroup}>
            <Text style={styles.inputLabel}>{t('onboarding.contactName')}</Text>
            <TextInput
              style={styles.setupInput}
              value={contactName}
              onChangeText={setContactName}
              placeholder={copy.contactNamePlaceholder}
              placeholderTextColor={Colors.textTertiary}
              testID="onboarding-contact-name"
            />
          </View>
          <View style={styles.setupDivider} />
          <View style={styles.setupInputGroup}>
            <Text style={styles.inputLabel}>{t('onboarding.relationship')}</Text>
            <TextInput
              style={styles.setupInput}
              value={contactRelationship}
              onChangeText={setContactRelationship}
              placeholder={copy.contactRelationshipPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              testID="onboarding-contact-relationship"
            />
          </View>
          <View style={styles.setupDivider} />
          <View style={styles.setupInputGroup}>
            <Text style={styles.inputLabel}>{t('onboarding.phone')}</Text>
            <TextInput
              style={styles.setupInput}
              value={contactPhone}
              onChangeText={(value) => setContactPhone(formatPhoneNumber(value))}
              placeholder={copy.contactPhonePlaceholder}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
              testID="onboarding-contact-phone"
            />
          </View>
        </View>
      </View>
      <Text style={styles.setupHint}>{copy.setupHint}</Text>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.progressRow}>
          {STEPS.map((_, index) => (
            <View
              key={String(index)}
              style={[
                styles.progressDot,
                index === currentStep ? styles.progressDotActive : undefined,
                index < currentStep ? styles.progressDotDone : undefined,
              ]}
            />
          ))}
        </View>
        <Animated.View style={[styles.body, { opacity: fadeAnim }]}> 
          {step === 'welcome' ? renderWelcome() : null}
          {step === 'setup' ? renderSetup() : null}
        </Animated.View>
        <View style={styles.footer}>
          {isLastStep ? (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} testID="onboarding-finish">
              <Text style={styles.finishBtnText}>{t('onboarding.getStarted')}</Text>
              <ArrowRight color={Colors.white} size={18} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} testID="onboarding-next">
              <Text style={styles.nextBtnText}>{t('onboarding.continue')}</Text>
              <ChevronRight color={Colors.white} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },
  progressDotDone: {
    backgroundColor: Colors.verified,
  },
  body: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  shieldOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(30,58,95,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  brandTagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 20,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  languageButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  languageButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  missionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    width: '100%',
  },
  missionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  welcomeTipCard: {
    width: '100%',
    backgroundColor: '#FFF8E8',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2D48B',
    marginBottom: 20,
    gap: 6,
  },
  welcomeTipTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#8A5A00',
    letterSpacing: 0.2,
  },
  welcomeTipText: {
    fontSize: 13,
    color: '#7A5B1A',
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  featureList: {
    width: '100%',
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapIconStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  snapCalloutCard: {
    width: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snapCalloutIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  snapCalloutText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 19,
    fontWeight: '600' as const,
  },
  featureTextBlock: {
    flex: 1,
    gap: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  disclaimerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    gap: 12,
  },
  disclaimerText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
  },
  disclaimerDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  privacyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
    width: '100%',
    gap: 14,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  privacyBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  privacyText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  privacyPolicyLinkBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.verifiedLight,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
  },
  privacyPolicyLinkText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.verified,
  },
  setupScroll: {
    flex: 1,
  },
  setupContent: {
    paddingBottom: 20,
    gap: 20,
  },
  setupSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -8,
  },
  setupSection: {
    gap: 8,
  },
  setupLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    paddingLeft: 4,
  },
  setupCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  setupInputGroup: {
    padding: 14,
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  setupInput: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 2,
  },
  setupDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 14,
  },
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bloodTypeChipActive: {
    backgroundColor: Colors.emergency,
    borderColor: Colors.emergency,
  },
  bloodTypeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  bloodTypeTextActive: {
    color: Colors.white,
  },
  setupHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
  footer: {
    paddingTop: 16,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.verified,
    borderRadius: 14,
    paddingVertical: 16,
  },
  finishBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
