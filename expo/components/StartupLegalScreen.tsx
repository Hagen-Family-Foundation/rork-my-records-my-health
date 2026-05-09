import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, CheckCircle, FileText, Heart, Lock, ShieldCheck } from 'lucide-react-native';

import { Text } from '@/components/ScaledText';
import Colors from '@/constants/colors';
import { useStartupLegal, type StartupLegalStep } from '@/providers/StartupLegalProvider';
import { triggerHaptic } from '@/utils/haptics';

interface LegalSection {
  title: string;
  body: string | string[];
  tone?: 'default' | 'warning' | 'secure';
}

interface LegalScreenCopy {
  stepLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  acceptButton: string;
  scrollHint: string;
  acceptedHelper: string;
  keepShowingTitle: string;
  keepShowingBody: string;
  availableLater: string;
  sections: LegalSection[];
}

function getLegalCopy(step: StartupLegalStep, acknowledgedAt: string | null): LegalScreenCopy {
  if (step === 'privacy') {
    return {
      stepLabel: 'Step 1 of 2',
      eyebrow: 'Privacy Policy',
      title: 'Your privacy comes first.',
      subtitle:
        'Please review the Privacy Policy before signing in. The Next button unlocks after you scroll to the end.',
      acceptButton: 'Next',
      scrollHint: 'Scroll through the full Privacy Policy to continue.',
      acceptedHelper: acknowledgedAt ? 'Previously acknowledged. You can still review it any time from Settings.' : 'Required before account access appears.',
      keepShowingTitle: 'Show Privacy Policy when app opens',
      keepShowingBody:
        'Turn this off to bypass this screen on future app starts. The Privacy Policy remains available inside Settings when you tap it.',
      availableLater: 'You can always open the Privacy Policy again from Settings > Privacy & Encryption.',
      sections: [
        {
          title: '1. Summary',
          body:
            'MyRecordsMyHealth is designed around user control. The medical information you choose to enter is intended to stay on your device and under your control.',
          tone: 'secure',
        },
        {
          title: '2. Information collection',
          body:
            'The app does not collect your health records for operator use, does not sell your information, does not broker your medical data, and does not use advertising trackers to profile you inside the app experience.',
        },
        {
          title: '3. Information you enter',
          body: [
            'You may choose to enter medications, allergies, medical conditions, physicians, insurance details, emergency contacts, emergency notes, documents, and other personal medical details.',
            'You decide what information to add, edit, display, print, export, or remove.',
          ],
        },
        {
          title: '4. Local storage',
          body:
            'Your records are intended to be stored locally on the device you use. The app is built for offline access to critical medical information, especially when fast access matters most.',
          tone: 'secure',
        },
        {
          title: '5. Sharing and printing',
          body:
            'Information leaves your control only when you choose to show it, print it, save it, download it, email it, export it, or share it using your own device tools. Emergency cards and exports reflect the information you choose to include.',
        },
        {
          title: '6. Device permissions',
          body:
            'Features such as camera access, photo import, biometric unlock, file saving, and sharing use your device capabilities only so the selected feature can work. You remain in control of what is captured or shared.',
        },
        {
          title: '7. No ads or data sales',
          body:
            'MyRecordsMyHealth is not built around advertising or selling user health data. The app is meant to help people keep life-saving information ready when needed.',
          tone: 'secure',
        },
        {
          title: '8. Your control',
          body:
            'You can update, correct, export, or delete information in the app. If you remove the app or clear local app data, locally stored records may be removed from that device.',
        },
        {
          title: '9. Changes and contact',
          body:
            'If this policy changes, the public policy will be updated with a revised effective date. Questions can be sent to support@myrecordsmyhealth.com.',
        },
      ],
    };
  }

  return {
    stepLabel: 'Step 2 of 2',
    eyebrow: 'Required Disclaimer',
    title: 'Important medical disclaimer.',
    subtitle:
      'Please review and accept this disclaimer before the sign-in page appears. The Accept button unlocks after you scroll to the end.',
    acceptButton: 'Accept Disclaimer',
    scrollHint: 'Scroll through the full Disclaimer to accept.',
    acceptedHelper: acknowledgedAt ? 'Previously accepted. You can still review this from Settings.' : 'Required before account access appears.',
    keepShowingTitle: 'Show Disclaimer when app opens',
    keepShowingBody:
      'Turn this off to bypass this screen on future app starts. The disclaimer remains visible inside the app for review.',
    availableLater: 'The Clinical Disclaimer remains visible in Settings for later review.',
    sections: [
      {
        title: '1. Offline user-controlled tool',
        body:
          'MyRecordsMyHealth is designed as a 100% offline, user-based medical information tool for storing and presenting the information you choose to enter. It is not a medical provider, hospital system, insurance system, or emergency dispatch service.',
        tone: 'secure',
      },
      {
        title: '2. No medical advice',
        body:
          'This app does not provide medical advice, diagnosis, treatment recommendations, medication instructions, or emergency care decisions. Always seek advice from a physician, pharmacist, emergency responder, or other qualified health professional for medical questions or emergencies.',
        tone: 'warning',
      },
      {
        title: '3. User-provided information',
        body:
          'The information shown in the app and on the printable emergency medical card is based on what the user enters, edits, verifies, and chooses to include. The app cannot guarantee that user-entered information is complete, current, or accurate.',
      },
      {
        title: '4. Emergency purpose',
        body:
          'The app is intended to make life-saving information easier to find in a critical moment, whether viewed directly in the app or printed on the emergency medical card. It can include 100% of the user’s medical information if the user chooses to enter and share that information.',
        tone: 'secure',
      },
      {
        title: '5. Verification by professionals',
        body:
          'Medical professionals and first responders should verify information with the patient, caregiver, medical records, medication bottles, treating clinicians, or other trusted sources whenever possible.',
      },
      {
        title: '6. No guaranteed outcome',
        body:
          'MyRecordsMyHealth cannot guarantee emergency outcomes, medical outcomes, record accuracy, device availability, battery availability, printer availability, or that any person will see or use the information in a particular situation.',
        tone: 'warning',
      },
      {
        title: '7. User responsibility',
        body:
          'You are responsible for reviewing and updating your information, deciding what to print or share, and choosing whether the emergency card should include all or only part of your medical information.',
      },
    ],
  };
}

export function StartupLegalLoadingScreen() {
  const pulseAnim = useRef(new Animated.Value(0.96)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.96, duration: 1100, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [fadeAnim, pulseAnim]);

  return (
    <LinearGradient colors={['#0C1D31', '#173657', '#F8FAFC']} style={styles.loadingShell}>
      <Animated.View style={[styles.loadingCard, { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.loadingIconWrap}>
          <ShieldCheck color="#FFFFFF" size={24} />
        </View>
        <Text style={styles.loadingTitle}>Preparing privacy review</Text>
        <Text style={styles.loadingSubtitle}>Checking required acknowledgements…</Text>
      </Animated.View>
    </LinearGradient>
  );
}

export function StartupLegalScreen() {
  const {
    acknowledgeStep,
    currentStartupStep,
    isSaving,
    preferences,
  } = useStartupLegal();
  const step = currentStartupStep ?? 'privacy';
  const acknowledgedAt = step === 'privacy' ? preferences.privacyAcknowledgedAt : preferences.disclaimerAcknowledgedAt;
  const savedShowOnStartup = step === 'privacy' ? preferences.showPrivacyOnStartup : preferences.showDisclaimerOnStartup;
  const copy = useMemo(() => getLegalCopy(step, acknowledgedAt), [acknowledgedAt, step]);
  const [showOnStartup, setShowOnStartup] = useState<boolean>(savedShowOnStartup);
  const [hasReachedEnd, setHasReachedEnd] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollViewHeightRef = useRef<number>(0);
  const contentHeightRef = useRef<number>(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    setShowOnStartup(savedShowOnStartup);
    setHasReachedEnd(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollViewHeightRef.current = 0;
    contentHeightRef.current = 0;
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, savedShowOnStartup, slideAnim, step]);

  const updateReachedEnd = useCallback((visibleHeight: number, offsetY: number, contentHeight: number) => {
    const reached = visibleHeight + Math.max(offsetY, 0) >= contentHeight - 28;
    if (reached) {
      setHasReachedEnd(true);
    }
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      scrollViewHeightRef.current = event.nativeEvent.layout.height;
      updateReachedEnd(scrollViewHeightRef.current, 0, contentHeightRef.current);
    },
    [updateReachedEnd]
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeightRef.current = height;
      updateReachedEnd(scrollViewHeightRef.current, 0, contentHeightRef.current);
    },
    [updateReachedEnd]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      updateReachedEnd(layoutMeasurement.height, contentOffset.y, contentSize.height);
    },
    [updateReachedEnd]
  );

  const handleToggle = useCallback((value: boolean) => {
    setShowOnStartup(value);
    void triggerHaptic('toggle');
  }, []);

  const handleAcknowledge = useCallback(async () => {
    if (!hasReachedEnd || isSaving) {
      return;
    }

    try {
      void triggerHaptic(step === 'privacy' ? 'navigate' : 'success');
      await acknowledgeStep(step, showOnStartup);
    } catch (error) {
      console.error('[StartupLegalScreen] Failed to acknowledge required legal step:', error);
      void triggerHaptic('error');
      Alert.alert('Unable to Save', 'Your acknowledgement could not be saved right now. Please try again.');
    }
  }, [acknowledgeStep, hasReachedEnd, isSaving, showOnStartup, step]);

  const isDisclaimer = step === 'disclaimer';
  const accentColor = isDisclaimer ? Colors.warning : Colors.primary;
  const gradientColors = isDisclaimer ? ['#4A1F0F', '#9A3412', '#FFF7ED'] : ['#0C1D31', '#173657', '#EFF6FF'];

  return (
    <LinearGradient colors={gradientColors} style={styles.shell}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.brandRow}>
            <Heart color="#F87171" size={14} />
            <Text style={styles.brandText}>MyRecordsMyHealth</Text>
          </View>
          <View style={styles.stepPill}>
            {isDisclaimer ? <AlertTriangle color="#FED7AA" size={13} /> : <Lock color="#BFDBFE" size={13} />}
            <Text style={styles.stepPillText}>{copy.stepLabel}</Text>
          </View>
          <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </Animated.View>

        <View style={styles.documentCard}>
          <ScrollView
            key={'startup-legal-scroll-view-' + step}
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            scrollEventThrottle={16}
            onLayout={handleLayout}
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleScroll}
            testID={'startup-legal-scroll-' + step}
          >
            <View style={[styles.noticeCard, { borderColor: isDisclaimer ? Colors.warningBorder : '#BFD7F0' }]}>
              <View style={[styles.noticeIcon, { backgroundColor: isDisclaimer ? Colors.warningLight : Colors.primaryLight }]}>
                {isDisclaimer ? <AlertTriangle color={Colors.warning} size={18} /> : <FileText color={Colors.primary} size={18} />}
              </View>
              <View style={styles.noticeTextWrap}>
                <Text style={[styles.noticeTitle, { color: accentColor }]}>{copy.acceptedHelper}</Text>
                <Text style={styles.noticeBody}>{copy.availableLater}</Text>
              </View>
            </View>

            {copy.sections.map((section) => {
              const toneColor = section.tone === 'warning' ? Colors.warning : section.tone === 'secure' ? Colors.verified : Colors.primary;
              const toneBg = section.tone === 'warning' ? Colors.warningLight : section.tone === 'secure' ? Colors.verifiedLight : Colors.primaryLight;
              const bodyParagraphs = Array.isArray(section.body) ? section.body : [section.body];

              return (
                <View key={section.title} style={styles.sectionBlock}>
                  <View style={[styles.sectionMarker, { backgroundColor: toneBg }]}>
                    {section.tone === 'warning' ? (
                      <AlertTriangle color={toneColor} size={15} />
                    ) : section.tone === 'secure' ? (
                      <ShieldCheck color={toneColor} size={15} />
                    ) : (
                      <FileText color={toneColor} size={15} />
                    )}
                  </View>
                  <View style={styles.sectionTextWrap}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {bodyParagraphs.map((paragraph, index) => (
                      <Text key={section.title + '-paragraph-' + String(index)} style={styles.sectionBody}>
                        {paragraph}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}

            {!isDisclaimer ? (
              <View
                style={styles.privacyFooterBlock}
                accessibilityLabel="My Records My Health Privacy Policy. Operated by My Body Is My Health."
              >
                <Text style={styles.privacyFooterTitle}>My Records My Health Privacy Policy.</Text>
                <Text style={styles.privacyFooterOperator}>Operated by My Body Is My Health.</Text>
              </View>
            ) : null}

            <View style={styles.toggleCard}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>{copy.keepShowingTitle}</Text>
                <Text style={styles.toggleBody}>{copy.keepShowingBody}</Text>
              </View>
              <Switch
                value={showOnStartup}
                onValueChange={handleToggle}
                trackColor={{ false: Colors.border, true: accentColor }}
                thumbColor={Colors.white}
                accessibilityLabel={copy.keepShowingTitle}
                testID={'startup-legal-repeat-toggle-' + step}
              />
            </View>

            <View style={styles.endBadge}>
              <CheckCircle color={hasReachedEnd ? Colors.verified : Colors.textTertiary} size={16} />
              <Text style={[styles.endBadgeText, hasReachedEnd ? styles.endBadgeTextReady : null]}>
                {hasReachedEnd ? 'End reached. You may continue.' : copy.scrollHint}
              </Text>
            </View>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: hasReachedEnd ? accentColor : Colors.textTertiary }]}
            onPress={() => {
              void handleAcknowledge();
            }}
            disabled={!hasReachedEnd || isSaving}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasReachedEnd || isSaving }}
            testID={'startup-legal-accept-' + step}
          >
            <Text style={styles.acceptButtonText}>{isSaving ? 'Saving…' : copy.acceptButton}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  brandText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  stepPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  stepPillText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  eyebrow: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  title: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 21,
  },
  documentCard: {
    flex: 1,
    marginHorizontal: 14,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 22,
    gap: 14,
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTextWrap: {
    flex: 1,
    gap: 3,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  sectionBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  sectionMarker: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  sectionTextWrap: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 5,
  },
  sectionTitle: {
    color: Colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: -0.1,
  },
  sectionBody: {
    color: Colors.textSecondary,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  privacyFooterBlock: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
    gap: 2,
  },
  privacyFooterTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800' as const,
    lineHeight: 20,
    textAlign: 'center' as const,
  },
  privacyFooterOperator: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center' as const,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleTextWrap: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  toggleBody: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  endBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
  },
  endBadgeText: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  endBadgeTextReady: {
    color: Colors.verified,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  acceptButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900' as const,
  },
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingCard: {
    width: '100%',
    borderRadius: 26,
    padding: 26,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    gap: 8,
  },
  loadingIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadingTitle: {
    fontSize: 19,
    fontWeight: '900' as const,
    color: Colors.text,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
