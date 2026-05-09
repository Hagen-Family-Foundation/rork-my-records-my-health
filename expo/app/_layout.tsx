import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View, TouchableOpacity, Animated } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, ShieldCheck, Heart, Fingerprint } from "lucide-react-native";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { Text } from "@/components/ScaledText";
import AuthScreen, { AuthLoadingScreen } from "@/components/AuthScreen";
import { StartupLegalLoadingScreen, StartupLegalScreen } from "@/components/StartupLegalScreen";
import { HealthRecordsProvider, useHealthRecords } from "@/providers/HealthRecordsProvider";
import { AccessibilityProvider } from "@/providers/AccessibilityProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { SecurityProvider, useSecurity } from "@/providers/SecurityProvider";
import { LocalizationProvider, useLocalization } from "@/providers/LocalizationProvider";
import { CommunicationsProvider } from "@/providers/CommunicationsProvider";
import { StartupLegalProvider, useStartupLegal } from "@/providers/StartupLegalProvider";
import { usePhraseSet } from "@/localization/runtime";
import Colors from "@/constants/colors";
import { triggerHaptic } from "@/utils/haptics";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function LockScreen() {
  const { unlock, disableAppLock, isAuthenticating } = useSecurity();
  const { t } = useLocalization();
  const copy = usePhraseSet({
    unlockAccessibilityLabel: 'Unlock with biometrics',
    disableLockAccessibilityLabel: 'Turn off app PIN or Face ID lock',
    disableLockButton: 'No PIN or Face ID',
    disableLockHelper: 'Open the app without the extra app lock. Your phone lock screen still protects the device.',
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, fadeAnim, slideAnim]);

  const handleUnlock = async () => {
    await unlock();
  };

  const handleDisableAppLock = () => {
    disableAppLock();
  };

  return (
    <LinearGradient
      colors={['#0F2640', '#1E3A5F', '#2A5080']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={lockStyles.container}
    >
      <Animated.View style={[lockStyles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[lockStyles.shieldCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={lockStyles.shieldInner}>
            <ShieldCheck color="#FFFFFF" size={40} />
          </View>
        </Animated.View>
        <View style={lockStyles.brandRow}>
          <Heart color="#DC2626" size={16} />
          <Text style={lockStyles.brandText}>{"MyRecordsMyHealth"}</Text>
        </View>
        <Text style={lockStyles.title}>{"MyRecordsMyHealth"}</Text>
        <Text style={lockStyles.subtitle}>{t('lock.subtitle')}</Text>
        <View style={lockStyles.securityBadges}>
          <View style={lockStyles.badgeChip}>
            <Lock color="#6FD5A6" size={11} />
            <Text style={lockStyles.badgeText}>{t('lock.encrypted')}</Text>
          </View>
          <View style={lockStyles.badgeChip}>
            <Fingerprint color="#6FD5A6" size={11} />
            <Text style={lockStyles.badgeText}>{t('lock.biometric')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={lockStyles.unlockBtn}
          onPress={handleUnlock}
          disabled={isAuthenticating}
          activeOpacity={0.8}
          accessibilityLabel={copy.unlockAccessibilityLabel}
          accessibilityRole="button"
          testID="lock-screen-unlock"
        >
          <Fingerprint color="#FFFFFF" size={20} />
          <Text style={lockStyles.unlockBtnText}>
            {isAuthenticating ? t('lock.authenticating') : t('lock.unlock')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={lockStyles.noLockBtn}
          onPress={handleDisableAppLock}
          disabled={isAuthenticating}
          activeOpacity={0.82}
          accessibilityLabel={copy.disableLockAccessibilityLabel}
          accessibilityRole="button"
          testID="lock-screen-disable-lock"
        >
          <Lock color="#D1FAE5" size={16} />
          <Text style={lockStyles.noLockBtnText}>{copy.disableLockButton}</Text>
        </TouchableOpacity>
        <Text style={lockStyles.noLockHelperText}>{copy.disableLockHelper}</Text>
      </Animated.View>
      <Text style={lockStyles.footerText}>{t('lock.footer')}</Text>
    </LinearGradient>
  );
}

function LanguageRestoreBanner() {
  const insets = useSafeAreaInsets();
  const { isLocked } = useSecurity();
  const {
    language,
    preferredLanguage,
    preferredLanguageMeta,
    englishFallbackEnabled,
    activatePreferredLanguage,
  } = useLocalization();
  const copy = usePhraseSet({
    emergencySafeModeLabel: 'English mode is active',
    emergencySafeModeSubtitle: 'Saved language is ready to restore in one tap.',
    restorePrefix: 'Use ',
  });
  const slideAnim = useRef(new Animated.Value(12)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const shouldShow = englishFallbackEnabled && language === 'en' && preferredLanguage !== 'en' && !isLocked;

  useEffect(() => {
    if (shouldShow) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      return;
    }

    slideAnim.setValue(12);
    opacityAnim.setValue(0);
  }, [opacityAnim, shouldShow, slideAnim]);

  const handleRestoreLanguage = useCallback(() => {
    void triggerHaptic('select');
    activatePreferredLanguage();
    console.log('[Localization] Restore banner used to switch back to saved language:', preferredLanguage);
  }, [activatePreferredLanguage, preferredLanguage]);

  if (!shouldShow) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={bannerStyles.portal}>
      <Animated.View
        style={[
          bannerStyles.card,
          {
            marginTop: insets.top + 10,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        testID="language-restore-banner"
      >
        <View style={bannerStyles.copyWrap}>
          <Text style={bannerStyles.eyebrow}>{copy.emergencySafeModeLabel}</Text>
          <Text style={bannerStyles.subtitle}>{copy.emergencySafeModeSubtitle}</Text>
        </View>
        <TouchableOpacity
          style={bannerStyles.actionButton}
          onPress={handleRestoreLanguage}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={copy.restorePrefix + preferredLanguageMeta.nativeName}
          testID="language-restore-button"
        >
          <Text style={bannerStyles.actionButtonText}>{copy.restorePrefix + preferredLanguageMeta.nativeName}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function RootLayoutNav() {
  const { isOnboardingComplete, isOnboardingLoaded } = useHealthRecords();
  const { isLocked } = useSecurity();
  const { t } = useLocalization();

  useEffect(() => {
    if (isOnboardingLoaded && !isOnboardingComplete) {
      router.replace('/onboarding');
    }
  }, [isOnboardingLoaded, isOnboardingComplete]);

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="edit-personal" options={{ title: t('screen.personalInfo') }} />
      <Stack.Screen name="edit-contacts" options={{ title: t('screen.emergencyContacts') }} />
      <Stack.Screen name="edit-allergies" options={{ title: t('screen.allergies') }} />
      <Stack.Screen name="edit-medications" options={{ title: t('screen.medications') }} />
      <Stack.Screen name="edit-conditions" options={{ title: t('screen.conditions') }} />
      <Stack.Screen name="edit-procedures" options={{ title: t('screen.procedures') }} />
      <Stack.Screen name="edit-insurance" options={{ title: t('screen.insurance') }} />
      <Stack.Screen name="edit-notes" options={{ title: t('screen.emergencyNotes') }} />
      <Stack.Screen name="edit-documents" options={{ title: t('screen.documents') }} />
      <Stack.Screen name="audit-log" options={{ title: t('screen.auditLog') }} />
      <Stack.Screen name="scanner" options={{ title: t('screen.scanCode') }} />
      <Stack.Screen name="search" options={{ title: t('screen.searchRecords') }} />
      <Stack.Screen name="wallet-card" options={{ title: t('screen.walletCard') }} />
      <Stack.Screen name="user-manual" options={{ title: 'User Manual' }} />
      <Stack.Screen name="integrity-check" options={{ title: t('screen.dataIntegrity') }} />
      {__DEV__ ? <Stack.Screen name="review-readiness" options={{ title: t('screen.reviewPrep') }} /> : null}
      <Stack.Screen name="accessibility-settings" options={{ title: t('screen.accessibility') }} />
      <Stack.Screen name="security-settings" options={{ title: t('screen.security') }} />
      <Stack.Screen name="language-settings" options={{ title: t('screen.language') }} />
      <Stack.Screen name="modal" options={{ presentation: "modal", title: t('screen.modal') }} />
    </Stack>
  );
}

function AuthenticatedApp() {
  return (
    <SecurityProvider>
      <HealthRecordsProvider>
        <RootLayoutNav />
        <LanguageRestoreBanner />
      </HealthRecordsProvider>
    </SecurityProvider>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const { currentStartupStep, isLoaded: isStartupLegalLoaded, markStartupCheckComplete } = useStartupLegal();

  useEffect(() => {
    if (isStartupLegalLoaded && !currentStartupStep) {
      markStartupCheckComplete();
    }
  }, [currentStartupStep, isStartupLegalLoaded, markStartupCheckComplete]);

  if (!isStartupLegalLoaded) {
    return <StartupLegalLoadingScreen />;
  }

  if (currentStartupStep) {
    return <StartupLegalScreen />;
  }

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <AuthenticatedApp />;
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <GestureHandlerRootView style={rootStyles.flex}>
          <LocalizationProvider>
            <AccessibilityProvider>
              <StartupLegalProvider>
                <AuthProvider>
                  <CommunicationsProvider>
                    <AuthGate />
                  </CommunicationsProvider>
                </AuthProvider>
              </StartupLegalProvider>
            </AccessibilityProvider>
          </LocalizationProvider>
        </GestureHandlerRootView>
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

const rootStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

const bannerStyles = StyleSheet.create({
  portal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
  card: {
    width: '92%',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15, 38, 64, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  copyWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: '#B6C8DD',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.78)',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.primaryDark,
  },
});

const lockStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  shieldCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shieldInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  securityBadges: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(111,213,166,0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6FD5A6',
    letterSpacing: 0.2,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 18,
    marginTop: 12,
  },
  unlockBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  noLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 8,
    backgroundColor: 'rgba(111,213,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(111,213,166,0.22)',
  },
  noLockBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#D1FAE5',
  },
  noLockHelperText: {
    maxWidth: 300,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.46)',
    textAlign: 'center',
    marginTop: 2,
  },
  footerText: {
    position: 'absolute' as const,
    bottom: 50,
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.3,
  },
});
