import React, { useCallback, useEffect, useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Accessibility,
  Camera,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  Languages,
  Lock,
  ShieldCheck,
  Share2,
} from 'lucide-react-native';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ScaledText';

import APP_CONFIG from '@/constants/appConfig';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';

interface ManualSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBackground: string;
  steps: string[];
}

interface ManualSectionCardProps {
  section: ManualSection;
  onOpenLanguageSettings?: () => void;
}

function ManualSectionCard({ section, onOpenLanguageSettings }: ManualSectionCardProps) {
  return (
    <View style={styles.sectionCard} testID={'manual-section-' + section.id}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: section.iconBackground }]}>{section.icon}</View>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionEyebrow}>{section.eyebrow}</Text>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      </View>
      <Text style={styles.sectionDescription}>{section.description}</Text>
      <View style={styles.stepList}>
        {section.steps.map((step, index) => {
          const shouldShowLanguageLink = section.id === 'welcome' && index === 1 && onOpenLanguageSettings;

          return (
            <View key={section.id + '-step-' + String(index)} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{String(index + 1)}</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepText}>{step}</Text>
                {shouldShowLanguageLink ? (
                  <TouchableOpacity
                    style={styles.languageDeepLink}
                    onPress={onOpenLanguageSettings}
                    accessibilityRole="button"
                    accessibilityLabel="Open App Language settings. After selecting a language, use the back arrow to return to this same User Manual step."
                    testID="manual-open-language-settings"
                  >
                    <View style={styles.languageDeepLinkIcon}>
                      <Languages color={Colors.primary} size={16} />
                    </View>
                    <View style={styles.languageDeepLinkCopy}>
                      <Text style={styles.languageDeepLinkTitle}>Open App Language</Text>
                      <Text style={styles.languageDeepLinkSubtitle}>Select a language, then tap the back arrow to return here.</Text>
                    </View>
                    <ChevronRight color={Colors.primary} size={18} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function UserManualScreen() {
  const router = useRouter();
  const copy = usePhraseSet({
    screenTitle: 'User Manual',
    heroEyebrow: 'Branded user guide',
    heroTitle: 'Onboarding Flow + Operating Instructions',
    heroDescription:
      'Written to be easy to scan, easy to follow, and clear enough for first-time users, caregivers, and family helpers.',
    heroChipOne: 'Simple setup',
    heroChipTwo: 'Emergency-ready',
    heroChipThree: 'Share only what you choose',
    quickStartTitle: 'READ THIS FIRST',
    quickStartDescription:
      'If you only remember four things, remember these: finish your basics, keep your records current, save/email/print your Emergency Card, and review what you share before sending it.',
    quickStartOne: 'Complete your name, blood type, emergency contacts, allergies, medications, and conditions first.',
    quickStartTwo: 'Use the Emergency screen as your fast-access summary, or open Share and choose Wallet Emergency Card when you need to save/download, email, or print the wallet-sized PDF.',
    quickStartThree: 'When sharing with a doctor, leave the defaults on and uncheck anything they did not ask for.',
    quickStartFour: 'Update your information after every medication change, diagnosis, procedure, or insurance change.',
    onboardingGroupTitle: 'PART 1 — ONBOARDING FLOW',
    operatingGroupTitle: 'PART 2 — OPERATING INSTRUCTIONS',
    habitsTitle: 'BEST EVERYDAY HABITS',
    habitsDescription:
      'A few small habits make the app far more useful in an emergency and much easier to trust over time.',
    habitsOne: 'Review your records after every doctor visit, medication change, or hospital stay.',
    habitsTwo: 'Keep at least one emergency contact current and make sure the phone number is correct.',
    habitsThree: 'Replace outdated document photos with clearer ones whenever you can.',
    habitsFour: 'Test the share flow before you need it so you already know how it works.',
    footerNote:
      'MyRecordsMyHealth is a patient-controlled record-keeping and emergency information tool. It does not replace professional medical advice, diagnosis, or treatment.',
  });

  useEffect(() => {
    console.log('[UserManual] Loaded branded user manual screen');
  }, []);

  const handleOpenLanguageSettings = useCallback(() => {
    router.push('/language-settings');
  }, [router]);

  const quickStartItems = useMemo<string[]>(
    () => [copy.quickStartOne, copy.quickStartTwo, copy.quickStartThree, copy.quickStartFour],
    [copy.quickStartFour, copy.quickStartOne, copy.quickStartThree, copy.quickStartTwo]
  );

  const onboardingSections = useMemo<ManualSection[]>(
    () => [
      {
        id: 'welcome',
        eyebrow: 'Getting started',
        title: 'First-time setup',
        description:
          'Use this flow the first time you open the app or any time you are helping someone set it up from scratch.',
        icon: <ShieldCheck color={Colors.primary} size={18} />,
        iconBackground: Colors.primaryLight,
        steps: [
          'Sign in or create your account to unlock the full app.',
          'If needed, use the App Language link directly below this step before continuing. Choose the language that is easiest to follow, then tap the back arrow to return to this same spot in the User Manual and continue onboarding. The selected language stays in effect until you change it again from App Language; on the very first startup only, the app begins in English.',
          'Read the welcome, disclaimer, and privacy screens. These explain what the app does, what it does not do, and how your data stays under your control.',
          'Enter the basics: first name, last name, blood type, and your primary emergency contact.',
          'Tap Get Started. It is okay if some fields are blank. You can fill them in later from the Records tab.',
          'After onboarding, go directly to Records and complete your high-priority health details while everything is fresh in your mind.',
        ],
      },
    ],
    []
  );

  const operatingSections = useMemo<ManualSection[]>(
    () => [
      {
        id: 'records',
        eyebrow: 'Daily use',
        title: 'Build and maintain your record',
        description:
          'The Records area is the main source of truth for your personal medical information inside the app.',
        icon: <FileText color={Colors.primary} size={18} />,
        iconBackground: Colors.primaryLight,
        steps: [
          'Open the Records tab and work through each section one at a time: personal info, contacts, allergies, medications, conditions, procedures, insurance, notes, and documents.',
          'Enter information exactly the way you want it seen. The app preserves your entered names, notes, and details as written.',
          'If you are tired or in a hurry, start with the essentials first: allergies, active medications, conditions, blood type, emergency contacts, and emergency notes.',
          'Return anytime to edit a section. Small updates done regularly are better than a large catch-up later.',
        ],
      },
      {
        id: 'documents',
        eyebrow: 'Photos and proof',
        title: 'Save medical documents and labels',
        description:
          'Use document storage to keep the items that are often hardest to find in a stressful moment.',
        icon: <Camera color={Colors.warning} size={18} />,
        iconBackground: Colors.warningLight,
        steps: [
          'Add clear photos of insurance cards, lab reports, prescription bottles, discharge paperwork, DNR forms, or other documents you may need quickly.',
          'Make sure the picture is readable before saving it. A clean photo is much more useful than a blurry one.',
          'Use the scanner when it helps, but if a barcode cannot be identified, type the important medication details manually so doctors can still read them clearly.',
          'Replace old or blurry photos whenever new paperwork arrives.',
        ],
      },
      {
        id: 'emergency',
        eyebrow: 'Fast access',
        title: 'Use Emergency View and print the Emergency Card',
        description:
          'These tools are designed for the moments when speed matters most, including when a paper copy is needed.',
        icon: <CreditCard color={Colors.emergency} size={18} />,
        iconBackground: Colors.emergencyLight,
        steps: [
          'Open the Emergency tab to see the high-priority summary a responder, caregiver, or doctor may need first.',
          'Tap Print Emergency Card at the bottom of Emergency View to create the wallet-sized card, or open Share and choose Wallet Emergency Card for the same PDF file.',
          'Use Save / Download to send the PDF to Files, a connected flash drive when your phone shows one, AirDrop, a printer app, or another file destination. Use Email Card to open your phone’s email/share options with the PDF attached.',
          'On Android or web, use the print dialog when available. If direct printing is not available, save/download the PDF and print that file from a printer app or computer.',
          'The printed date is added automatically from the device date, so you do not have to type or update that detail yourself.',
          'Cut along the card border after printing, then keep the wallet-sized Emergency Card in your wallet, purse, bag, glove box, or wherever it will be easy to find.',
          'Check the Emergency screen after you update your records to make sure the summary still reflects what you want seen first before printing a new copy.',
        ],
      },
      {
        id: 'sharing',
        eyebrow: 'Doctor communication',
        title: 'Share only what the doctor asked for',
        description:
          'The sharing flow is built to give the user final control before anything leaves the device.',
        icon: <Share2 color={Colors.verified} size={18} />,
        iconBackground: Colors.verifiedLight,
        steps: [
          'Open the Share tab and choose the template that best matches the reason for sending: complete record, specialist visit, emergency summary, paperwork only, or Wallet Emergency Card.',
          'By default, your name stays included and most other sections can stay on. If the doctor did not ask for something, uncheck it a la carte before sending.',
          'Review the included and excluded sections carefully. The confirmation step is your final chance to catch anything extra.',
          'Enter the doctor’s email address and open the email draft. Nothing is sent until you approve it in your mail app.',
        ],
      },
      {
        id: 'accessibility',
        eyebrow: 'Comfort and control',
        title: 'Adjust language, accessibility, and security',
        description:
          'These settings help the app fit the user instead of forcing the user to fit the app.',
        icon: <Languages color={Colors.primary} size={18} />,
        iconBackground: Colors.primaryLight,
        steps: [
          'Open Settings to change the app language if another language is easier for you or your family to use.',
          'Use Accessibility Settings for text size, contrast, haptic feedback, and screen reader support.',
          'Use Security Settings to manage biometric unlock and other device-protection preferences.',
          'Check the Audit Log if you want to review when records were viewed, edited, exported, or shared.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Trust',
        title: 'Understand privacy and encryption',
        description:
          'The app is designed so the user stays in control of their information.',
        icon: <Lock color={Colors.verified} size={18} />,
        iconBackground: Colors.verifiedLight,
        steps: [
          'Your records stay on your device unless you choose to export or share them.',
          'Health data is encrypted and the app does not sell, broker, or hide advertising inside your record experience.',
          'Sharing is user-approved. The app prepares the export or email draft, but the final send action is still yours.',
          'If something feels outdated, incomplete, or wrong, update it immediately so the next emergency summary is stronger.',
        ],
      },
      {
        id: 'access-help',
        eyebrow: 'Help from family or caregivers',
        title: 'How another person can help you use it',
        description:
          'This is useful for spouses, adult children, caregivers, and even smart kids helping a grandparent.',
        icon: <Accessibility color={Colors.warning} size={18} />,
        iconBackground: Colors.warningLight,
        steps: [
          'Sit together and read each section title out loud before entering anything. This keeps the process calm and organized.',
          'One person can read from the manual while the other enters the information into the app step by step.',
          'After each section, pause and ask: Is this current? Is this spelled correctly? Would a doctor understand this quickly?',
          'Before calling setup complete, check the Emergency tab, use the Share tab’s Wallet Emergency Card actions once, save/email/print the PDF, and review the Share flow so there are no surprises later.',
        ],
      },
    ],
    []
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="user-manual-screen"
    >
      <Stack.Screen options={{ title: copy.screenTitle }} />

      <LinearGradient
        colors={['#0F2640', '#1E3A5F', '#2A5080']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Heart color="#FFFFFF" size={20} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>{APP_CONFIG.name}</Text>
            <Text style={styles.brandSubtitle}>{'A ' + APP_CONFIG.parentBrand + ' product'}</Text>
          </View>
        </View>

        <Text style={styles.heroEyebrow}>{copy.heroEyebrow}</Text>
        <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
        <Text style={styles.heroDescription}>{copy.heroDescription}</Text>

        <View style={styles.heroChipRow}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>{copy.heroChipOne}</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>{copy.heroChipTwo}</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>{copy.heroChipThree}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.summaryCard} testID="user-manual-quick-start">
        <Text style={styles.groupTitle}>{copy.quickStartTitle}</Text>
        <Text style={styles.summaryDescription}>{copy.quickStartDescription}</Text>
        <View style={styles.summaryList}>
          {quickStartItems.map((item, index) => (
            <View key={'quick-start-' + String(index)} style={styles.summaryRow}>
              <View style={styles.summaryDot} />
              <Text style={styles.summaryText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.groupHeading}>{copy.onboardingGroupTitle}</Text>
      {onboardingSections.map((section) => (
        <ManualSectionCard key={section.id} section={section} onOpenLanguageSettings={handleOpenLanguageSettings} />
      ))}

      <Text style={styles.groupHeading}>{copy.operatingGroupTitle}</Text>
      {operatingSections.map((section) => (
        <ManualSectionCard key={section.id} section={section} />
      ))}

      <View style={styles.habitsCard} testID="user-manual-best-habits">
        <Text style={styles.groupTitle}>{copy.habitsTitle}</Text>
        <Text style={styles.summaryDescription}>{copy.habitsDescription}</Text>
        <View style={styles.summaryList}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>{copy.habitsOne}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>{copy.habitsTwo}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>{copy.habitsThree}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>{copy.habitsFour}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerNote}>{copy.footerNote}</Text>
      </View>
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
    gap: 16,
    paddingBottom: 28,
  },
  hero: {
    borderRadius: 28,
    padding: 22,
    gap: 14,
    shadowColor: '#0F2640',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  brandSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.76)',
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: '#BFD1E7',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.86)',
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  heroChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 12,
  },
  habitsCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 12,
  },
  groupHeading: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1,
    color: Colors.textTertiary,
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1,
    color: Colors.textTertiary,
  },
  summaryDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  summaryList: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: Colors.textTertiary,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  stepList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  stepTextWrap: {
    flex: 1,
    gap: 8,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text,
  },
  languageDeepLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  languageDeepLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  languageDeepLinkCopy: {
    flex: 1,
    gap: 2,
  },
  languageDeepLinkTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.primaryDark,
  },
  languageDeepLinkSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  footerCard: {
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerNote: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
