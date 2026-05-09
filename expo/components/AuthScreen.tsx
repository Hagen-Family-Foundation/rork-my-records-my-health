import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/ScaledText';
import { LinearGradient } from 'expo-linear-gradient';
import { ExternalLink, Eye, EyeOff, Fingerprint, Heart, KeyRound, LockKeyhole, Mail, ShieldCheck, User } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { useAuth, DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD } from '@/providers/AuthProvider';
import { SUPPORT_EMAIL, buildGeneralSupportEmail, openSupportEmail } from '@/utils/support';
import { openPrivacyPolicy } from '@/utils/privacy';

type AuthMode = 'sign-in' | 'sign-up';

function isValidEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export function AuthLoadingScreen() {
  const pulseAnim = useRef(new Animated.Value(0.96)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.96, duration: 1200, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [fadeAnim, pulseAnim]);

  return (
    <View style={loadingStyles.shell}>
      <SafeAreaView style={loadingStyles.safeArea} edges={['top', 'bottom']}>
        <LinearGradient colors={['#0C1D31', '#153354', '#22486D']} style={loadingStyles.gradient}>
          <Animated.View
            style={[
              loadingStyles.loaderCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
            testID="auth-loading-screen"
          >
            <View style={loadingStyles.loaderIconWrap}>
              <ShieldCheck color="#FFFFFF" size={22} />
            </View>
            <Text style={loadingStyles.loaderTitle}>Preparing secure sign-in</Text>
            <Text style={loadingStyles.loaderSubtitle}>Checking your saved session…</Text>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

export default function AuthScreen() {
  const {
    clearError,
    errorMessage,
    isConfigured,
    isSigningIn,
    isSigningUp,
    signIn,
    signUp,
    hasAccessPin,
    accessBiometricEnabled,
    accessBiometricInfo,
    isUnlocking,
    createAccessPin,
    unlockWithPin,
    unlockWithBiometrics,
    setAccessBiometricEnabled,
    continueWithoutAccessLock,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>(DEMO_ACCOUNT_EMAIL);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNT_PASSWORD);
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [enableBiometricAfterPin, setEnableBiometricAfterPin] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(18)).current;
  const orbAnim = useRef(new Animated.Value(0)).current;

  const copy = usePhraseSet({
    eyebrow: 'Account access',
    titleSignIn: 'Open your records faster',
    titleSignUp: 'Create your secure account',
    subtitle:
      'Use a simple 4 or 6 digit PIN for everyday access. Email/password remains available as a backup.',
    signInTab: 'Email Login',
    signUpTab: 'Create Account',
    pinSetupTitle: 'Create your quick access PIN',
    pinUnlockTitle: 'Enter your PIN',
    pinSetupBody: 'Choose a 4 or 6 digit PIN. You can also turn on Face ID or biometric unlock after the PIN is saved.',
    pinUnlockBody: 'Use your PIN for fast access, or use biometrics if you turned it on for this device.',
    pinLabel: 'Access PIN',
    pinPlaceholder: '4 or 6 digits',
    confirmPinLabel: 'Confirm PIN',
    confirmPinPlaceholder: 'Re-enter PIN',
    savePinButton: 'Save PIN & Open App',
    unlockPinButton: 'Unlock with PIN',
    unlockBiometricButton: 'Unlock with {type}',
    enableBiometricButton: 'Turn on {type}',
    biometricEnabledMessage: '{type} unlock is ready for next time.',
    biometricUnavailableMessage: 'Biometric unlock is not available in this preview or on this device.',
    noLockButton: 'Continue without PIN or Face ID',
    noLockHelper: 'Skip the extra app lock and open your records now. You can still use your phone’s own lock screen and turn app security back on later.',
    pinMismatchMessage: 'The PIN entries do not match.',
    pinLengthMessage: 'Use exactly 4 or 6 digits for your PIN.',
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'Jane Doe',
    emailLabel: 'Email address',
    emailPlaceholder: 'name@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    signInButton: 'Sign In',
    createAccountButton: 'Create Account',
    signingIn: 'Signing in…',
    creatingAccount: 'Creating account…',
    localOnlyBadge: 'Local records',
    encryptedBadge: 'Encrypted on device',
    accountBadge: 'Protected sign-in',
    helperTitle: 'Why this screen exists',
    helperBody:
      'Account sign-in protects app access across sessions while keeping the medical record itself stored locally on the device.',
    supportTitle: 'Need help?',
    supportBody: 'Questions about sign-in or setup? Reach us at {email}.',
    supportButton: 'Email Support',
    supportEmailReadyTitle: 'Email Ready',
    supportEmailReadyMessage: 'Your email app opened with a ready-to-send message to our team.',
    supportEmailOpenFailedMessage: 'Could not open your email app right now.',
    invalidEmailMessage: 'Please enter a valid email address.',
    shortPasswordMessage: 'Please use a password with at least 6 characters.',
    accountCreatedMessage:
      'Account created. Check your email to confirm your address if a confirmation message was sent.',
    authNotConfiguredMessage:
      'Authentication is not configured yet. Add your Supabase project keys to enable sign-in.',
    termsPrefix: 'By continuing you agree to our ',
    privacyPolicyLink: 'Privacy Policy',
    privacyPolicySuffix: '.',
    viewFullPrivacyPolicy: 'View full Privacy Policy',
    privacyPolicyOpenFailedMessage: 'Could not open the privacy policy right now.',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(orbAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
          Animated.timing(orbAnim, { toValue: 0, duration: 2600, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [fadeAnim, orbAnim, translateAnim]);

  const isSubmitting = isSigningIn || isSigningUp || isUnlocking;
  const title = mode === 'sign-in' ? copy.titleSignIn : copy.titleSignUp;
  const submitLabel = mode === 'sign-in' ? copy.signInButton : copy.createAccountButton;
  const pendingLabel = mode === 'sign-in' ? copy.signingIn : copy.creatingAccount;
  const activeFeedback = errorMessage ?? statusMessage;
  const isErrorFeedback = Boolean(errorMessage);

  const clearFeedback = useCallback(() => {
    setStatusMessage(null);
    clearError();
  }, [clearError]);

  const normalizePin = useCallback((value: string) => value.replace(/\D/g, '').slice(0, 6), []);

  const isValidPinLength = useCallback((value: string) => value.length === 4 || value.length === 6, []);

  const handleModeChange = useCallback(
    (nextMode: AuthMode) => {
      setMode(nextMode);
      clearFeedback();
      console.log('[AuthScreen] Switched auth mode to:', nextMode);
    },
    [clearFeedback]
  );

  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (activeFeedback) {
        clearFeedback();
      }
    },
    [activeFeedback, clearFeedback]
  );

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (activeFeedback) {
        clearFeedback();
      }
    },
    [activeFeedback, clearFeedback]
  );

  const handlePinChange = useCallback(
    (value: string) => {
      setPin(normalizePin(value));
      if (activeFeedback) {
        clearFeedback();
      }
    },
    [activeFeedback, clearFeedback, normalizePin]
  );

  const handleConfirmPinChange = useCallback(
    (value: string) => {
      setConfirmPin(normalizePin(value));
      if (activeFeedback) {
        clearFeedback();
      }
    },
    [activeFeedback, clearFeedback, normalizePin]
  );

  const handleFullNameChange = useCallback(
    (value: string) => {
      setFullName(value);
      if (activeFeedback) {
        clearFeedback();
      }
    },
    [activeFeedback, clearFeedback]
  );

  const handlePinSubmit = useCallback(async () => {
    const normalizedPin = normalizePin(pin);
    const normalizedConfirmPin = normalizePin(confirmPin);

    if (!isValidPinLength(normalizedPin)) {
      setStatusMessage(copy.pinLengthMessage);
      console.warn('[AuthScreen] PIN action blocked due to invalid length');
      return;
    }

    clearFeedback();

    if (hasAccessPin) {
      await unlockWithPin(normalizedPin);
      return;
    }

    if (normalizedPin !== normalizedConfirmPin) {
      setStatusMessage(copy.pinMismatchMessage);
      console.warn('[AuthScreen] PIN setup blocked due to mismatch');
      return;
    }

    const created = await createAccessPin(normalizedPin);
    if (created && enableBiometricAfterPin && accessBiometricInfo.available) {
      const enabled = await setAccessBiometricEnabled(true);
      if (enabled) {
        setStatusMessage(copy.biometricEnabledMessage.replace('{type}', accessBiometricInfo.biometricType));
      }
    }
  }, [
    accessBiometricInfo.available,
    accessBiometricInfo.biometricType,
    clearFeedback,
    confirmPin,
    copy.biometricEnabledMessage,
    copy.pinLengthMessage,
    copy.pinMismatchMessage,
    createAccessPin,
    enableBiometricAfterPin,
    hasAccessPin,
    isValidPinLength,
    normalizePin,
    pin,
    setAccessBiometricEnabled,
    unlockWithPin,
  ]);

  const handleBiometricUnlock = useCallback(async () => {
    clearFeedback();
    await unlockWithBiometrics();
  }, [clearFeedback, unlockWithBiometrics]);

  const handleContinueWithoutLock = useCallback(async () => {
    clearFeedback();
    const continued = await continueWithoutAccessLock();
    console.log('[AuthScreen] Continue without app access lock result:', continued);
  }, [clearFeedback, continueWithoutAccessLock]);

  const handleEnableBiometric = useCallback(async () => {
    clearFeedback();
    const enabled = await setAccessBiometricEnabled(true);
    if (enabled) {
      setStatusMessage(copy.biometricEnabledMessage.replace('{type}', accessBiometricInfo.biometricType));
    }
  }, [accessBiometricInfo.biometricType, clearFeedback, copy.biometricEnabledMessage, setAccessBiometricEnabled]);

  const handleUseProvidedCredentials = useCallback(() => {
    setMode('sign-in');
    setEmail(DEMO_ACCOUNT_EMAIL);
    setPassword(DEMO_ACCOUNT_PASSWORD);
    clearFeedback();
    console.log('[AuthScreen] Provided email/password credentials filled');
  }, [clearFeedback]);

  const handleSubmit = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();

    const isDemo =
      mode === 'sign-in' &&
      trimmedEmail === DEMO_ACCOUNT_EMAIL &&
      trimmedPassword === DEMO_ACCOUNT_PASSWORD;

    if (!isDemo) {
      if (!isConfigured) {
        setStatusMessage(copy.authNotConfiguredMessage);
        console.warn('[AuthScreen] Submit blocked because auth is not configured');
        return;
      }

      if (!isValidEmail(trimmedEmail)) {
        setStatusMessage(copy.invalidEmailMessage);
        console.warn('[AuthScreen] Submit blocked due to invalid email');
        return;
      }

      if (trimmedPassword.length < 6) {
        setStatusMessage(copy.shortPasswordMessage);
        console.warn('[AuthScreen] Submit blocked due to short password');
        return;
      }
    }

    clearFeedback();

    try {
      if (mode === 'sign-in') {
        await signIn({ email: trimmedEmail, password: trimmedPassword });
        console.log('[AuthScreen] Sign in flow completed');
        return;
      }

      const result = await signUp({
        fullName: trimmedFullName,
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (result.requiresEmailConfirmation) {
        setStatusMessage(copy.accountCreatedMessage);
        setMode('sign-in');
      }

      console.log('[AuthScreen] Sign up flow completed. requiresEmailConfirmation=', result.requiresEmailConfirmation);
    } catch (error) {
      console.error('[AuthScreen] Auth submit error:', error);
    }
  }, [
    clearFeedback,
    copy.accountCreatedMessage,
    copy.authNotConfiguredMessage,
    copy.invalidEmailMessage,
    copy.shortPasswordMessage,
    email,
    fullName,
    isConfigured,
    mode,
    password,
    signIn,
    signUp,
  ]);

  const handleSupportPress = useCallback(async () => {
    const opened = await openSupportEmail(
      buildGeneralSupportEmail({
        email: email.trim() || null,
        fullName: fullName.trim() || null,
      })
    );

    if (opened) {
      Alert.alert(copy.supportEmailReadyTitle, copy.supportEmailReadyMessage);
      return;
    }

    Alert.alert(copy.supportEmailOpenFailedMessage);
  }, [copy.supportEmailOpenFailedMessage, copy.supportEmailReadyMessage, copy.supportEmailReadyTitle, email, fullName]);

  const handlePrivacyPolicyPress = useCallback(async () => {
    const opened = await openPrivacyPolicy();
    if (!opened) {
      Alert.alert(copy.privacyPolicyLink, copy.privacyPolicyOpenFailedMessage);
    }
  }, [copy.privacyPolicyLink, copy.privacyPolicyOpenFailedMessage]);

  const orbTransform = useMemo(
    () => ({
      transform: [
        {
          translateY: orbAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -18],
          }),
        },
      ],
      opacity: orbAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.42, 0.72],
      }),
    }),
    [orbAnim]
  );

  return (
    <View style={styles.shell}>
      <LinearGradient colors={['#081421', '#0F2740', '#173B5C']} style={styles.backdrop}>
        <Animated.View style={[styles.orbLarge, orbTransform]} />
        <Animated.View style={[styles.orbSmall, orbTransform]} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={[
                  styles.hero,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: translateAnim }],
                  },
                ]}
              >
                <View style={styles.brandRow}>
                  <View style={styles.brandBadge}>
                    <Heart color="#FFB4B4" size={14} />
                    <Text style={styles.brandText}>MyRecordsMyHealth</Text>
                  </View>
                </View>
                <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{copy.subtitle}</Text>
                <TouchableOpacity
                  style={styles.heroPrivacyLink}
                  onPress={() => { void handlePrivacyPolicyPress(); }}
                  activeOpacity={0.84}
                  accessibilityRole="link"
                  accessibilityLabel={copy.viewFullPrivacyPolicy}
                  testID="auth-hero-privacy-policy-link"
                >
                  <Text style={styles.heroPrivacyLinkText}>{copy.viewFullPrivacyPolicy}</Text>
                  <ExternalLink color="#BFE7FF" size={14} />
                </TouchableOpacity>
                <View style={styles.badgeRow}>
                  <View style={styles.infoBadge}>
                    <ShieldCheck color="#7BE0AE" size={13} />
                    <Text style={styles.infoBadgeText}>{copy.localOnlyBadge}</Text>
                  </View>
                  <View style={styles.infoBadge}>
                    <LockKeyhole color="#7BE0AE" size={13} />
                    <Text style={styles.infoBadgeText}>{copy.encryptedBadge}</Text>
                  </View>
                  <View style={styles.infoBadge}>
                    <Mail color="#7BE0AE" size={13} />
                    <Text style={styles.infoBadgeText}>{copy.accountBadge}</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: translateAnim }],
                  },
                ]}
                testID="auth-screen"
              >
                <View style={styles.pinPanel} testID="quick-access-panel">
                  <View style={styles.pinHeaderRow}>
                    <View style={styles.pinIconWrap}>
                      <KeyRound color="#FFFFFF" size={20} />
                    </View>
                    <View style={styles.pinHeaderCopy}>
                      <Text style={styles.pinTitle}>{hasAccessPin ? copy.pinUnlockTitle : copy.pinSetupTitle}</Text>
                      <Text style={styles.pinBody}>{hasAccessPin ? copy.pinUnlockBody : copy.pinSetupBody}</Text>
                    </View>
                  </View>

                  <View style={styles.pinInputRow}>
                    <View style={styles.pinInputBlock}>
                      <Text style={styles.fieldLabel}>{copy.pinLabel}</Text>
                      <View style={styles.pinInputWrap}>
                        <KeyRound color={Colors.textTertiary} size={18} />
                        <TextInput
                          value={pin}
                          onChangeText={handlePinChange}
                          placeholder={copy.pinPlaceholder}
                          placeholderTextColor={Colors.textTertiary}
                          style={styles.pinInput}
                          secureTextEntry
                          keyboardType="number-pad"
                          autoCapitalize="none"
                          autoCorrect={false}
                          maxLength={6}
                          textContentType="oneTimeCode"
                          testID="auth-pin-input"
                        />
                      </View>
                    </View>

                    {!hasAccessPin ? (
                      <View style={styles.pinInputBlock}>
                        <Text style={styles.fieldLabel}>{copy.confirmPinLabel}</Text>
                        <View style={styles.pinInputWrap}>
                          <ShieldCheck color={Colors.textTertiary} size={18} />
                          <TextInput
                            value={confirmPin}
                            onChangeText={handleConfirmPinChange}
                            placeholder={copy.confirmPinPlaceholder}
                            placeholderTextColor={Colors.textTertiary}
                            style={styles.pinInput}
                            secureTextEntry
                            keyboardType="number-pad"
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={6}
                            textContentType="oneTimeCode"
                            testID="auth-confirm-pin-input"
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>

                  {!hasAccessPin && accessBiometricInfo.available ? (
                    <TouchableOpacity
                      style={styles.biometricChoiceRow}
                      onPress={() => setEnableBiometricAfterPin((current) => !current)}
                      activeOpacity={0.84}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: enableBiometricAfterPin }}
                      testID="auth-enable-biometric-after-pin"
                    >
                      <View style={[styles.choiceDot, enableBiometricAfterPin ? styles.choiceDotActive : null]} />
                      <Text style={styles.biometricChoiceText}>
                        {copy.enableBiometricButton.replace('{type}', accessBiometricInfo.biometricType)} after PIN setup
                      </Text>
                    </TouchableOpacity>
                  ) : !hasAccessPin ? (
                    <Text style={styles.biometricUnavailableText}>{copy.biometricUnavailableMessage}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.pinPrimaryButton, isSubmitting ? styles.submitButtonDisabled : null]}
                    onPress={() => {
                      void handlePinSubmit();
                    }}
                    disabled={isSubmitting}
                    activeOpacity={0.88}
                    testID="auth-pin-submit-button"
                  >
                    <Text style={styles.pinPrimaryButtonText}>
                      {isUnlocking ? 'Working…' : hasAccessPin ? copy.unlockPinButton : copy.savePinButton}
                    </Text>
                  </TouchableOpacity>

                  {hasAccessPin && accessBiometricEnabled && accessBiometricInfo.available ? (
                    <TouchableOpacity
                      style={styles.biometricButton}
                      onPress={() => {
                        void handleBiometricUnlock();
                      }}
                      disabled={isSubmitting}
                      activeOpacity={0.86}
                      testID="auth-biometric-unlock-button"
                    >
                      <Fingerprint color={Colors.primary} size={18} />
                      <Text style={styles.biometricButtonText}>
                        {copy.unlockBiometricButton.replace('{type}', accessBiometricInfo.biometricType)}
                      </Text>
                    </TouchableOpacity>
                  ) : hasAccessPin && !accessBiometricEnabled && accessBiometricInfo.available ? (
                    <TouchableOpacity
                      style={styles.biometricButton}
                      onPress={() => {
                        void handleEnableBiometric();
                      }}
                      disabled={isSubmitting}
                      activeOpacity={0.86}
                      testID="auth-enable-biometric-button"
                    >
                      <Fingerprint color={Colors.primary} size={18} />
                      <Text style={styles.biometricButtonText}>
                        {copy.enableBiometricButton.replace('{type}', accessBiometricInfo.biometricType)}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.noLockButton}
                    onPress={() => {
                      void handleContinueWithoutLock();
                    }}
                    disabled={isSubmitting}
                    activeOpacity={0.84}
                    accessibilityRole="button"
                    accessibilityLabel={copy.noLockButton}
                    testID="auth-continue-without-lock"
                  >
                    <Text style={styles.noLockButtonText}>{copy.noLockButton}</Text>
                  </TouchableOpacity>

                  <Text style={styles.noLockHelperText}>{copy.noLockHelper}</Text>

                  <TouchableOpacity
                    style={styles.providedCredentialsButton}
                    onPress={handleUseProvidedCredentials}
                    activeOpacity={0.84}
                    testID="auth-use-provided-credentials"
                  >
                    <Mail color={Colors.primary} size={16} />
                    <Text style={styles.providedCredentialsText}>Use email/password instead</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[styles.segmentButton, mode === 'sign-in' ? styles.segmentButtonActive : null]}
                    onPress={() => handleModeChange('sign-in')}
                    activeOpacity={0.86}
                    testID="auth-mode-sign-in"
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        mode === 'sign-in' ? styles.segmentButtonTextActive : null,
                      ]}
                    >
                      {copy.signInTab}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentButton, mode === 'sign-up' ? styles.segmentButtonActive : null]}
                    onPress={() => handleModeChange('sign-up')}
                    activeOpacity={0.86}
                    testID="auth-mode-sign-up"
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        mode === 'sign-up' ? styles.segmentButtonTextActive : null,
                      ]}
                    >
                      {copy.signUpTab}
                    </Text>
                  </TouchableOpacity>
                </View>

                {mode === 'sign-up' ? (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>{copy.fullNameLabel}</Text>
                    <View style={styles.inputWrap}>
                      <User color={Colors.textTertiary} size={18} />
                      <TextInput
                        value={fullName}
                        onChangeText={handleFullNameChange}
                        placeholder={copy.fullNamePlaceholder}
                        placeholderTextColor={Colors.textTertiary}
                        style={styles.input}
                        autoCapitalize="words"
                        autoCorrect={false}
                        testID="auth-full-name-input"
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{copy.emailLabel}</Text>
                  <View style={styles.inputWrap}>
                    <Mail color={Colors.textTertiary} size={18} />
                    <TextInput
                      value={email}
                      onChangeText={handleEmailChange}
                      placeholder={copy.emailPlaceholder}
                      placeholderTextColor={Colors.textTertiary}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      testID="auth-email-input"
                    />
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{copy.passwordLabel}</Text>
                  <View style={styles.inputWrap}>
                    <LockKeyhole color={Colors.textTertiary} size={18} />
                    <TextInput
                      value={password}
                      onChangeText={handlePasswordChange}
                      placeholder={copy.passwordPlaceholder}
                      placeholderTextColor={Colors.textTertiary}
                      style={styles.input}
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                      testID="auth-password-input"
                    />
                    <TouchableOpacity
                      style={styles.visibilityButton}
                      onPress={() => setIsPasswordVisible((current) => !current)}
                      activeOpacity={0.8}
                      testID="auth-password-visibility-toggle"
                    >
                      {isPasswordVisible ? (
                        <EyeOff color={Colors.textTertiary} size={18} />
                      ) : (
                        <Eye color={Colors.textTertiary} size={18} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {activeFeedback ? (
                  <View
                    style={[styles.feedbackCard, isErrorFeedback ? styles.feedbackError : styles.feedbackSuccess]}
                    testID="auth-feedback"
                  >
                    <Text style={[styles.feedbackText, isErrorFeedback ? styles.feedbackTextError : null]}>
                      {activeFeedback}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.termsRow}>
                  <Text style={styles.termsText}>
                    {copy.termsPrefix}
                    <Text
                      style={styles.termsLink}
                      onPress={() => { void handlePrivacyPolicyPress(); }}
                      testID="auth-privacy-link"
                    >
                      {copy.privacyPolicyLink}
                    </Text>
                    {copy.privacyPolicySuffix}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting || !isConfigured ? styles.submitButtonDisabled : null]}
                  onPress={() => {
                    void handleSubmit();
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.88}
                  testID="auth-submit-button"
                >
                  <LinearGradient
                    colors={['#143A5C', '#1E4D74', '#235D8F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitGradient}
                  >
                    <Text style={styles.submitButtonText}>{isSubmitting ? pendingLabel : submitLabel}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.helperCard}>
                  <Text style={styles.helperTitle}>{copy.helperTitle}</Text>
                  <Text style={styles.helperBody}>{copy.helperBody}</Text>
                  <Text style={styles.demoHint} testID="auth-demo-hint">
                    Backup email access: sign in with{' '}
                    <Text style={styles.demoHintValue}>{DEMO_ACCOUNT_EMAIL}</Text> /{' '}
                    <Text style={styles.demoHintValue}>{DEMO_ACCOUNT_PASSWORD}</Text>
                  </Text>
                </View>

                <View style={styles.supportCard}>
                  <Text style={styles.supportTitle}>{copy.supportTitle}</Text>
                  <Text style={styles.supportBody}>{copy.supportBody.replace('{email}', SUPPORT_EMAIL)}</Text>
                  <TouchableOpacity
                    style={styles.supportButton}
                    onPress={() => {
                      void handleSupportPress();
                    }}
                    activeOpacity={0.84}
                    testID="auth-support-button"
                  >
                    <Mail color={Colors.primary} size={16} />
                    <Text style={styles.supportButtonText}>{copy.supportButton}</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0C1D31',
  },
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  loaderIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 16,
  },
  loaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  loaderSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#081421',
  },
  backdrop: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 22,
  },
  hero: {
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#A9C4DD',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.9,
    maxWidth: 320,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 360,
  },
  heroPrivacyLink: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(191, 231, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.28)',
  },
  heroPrivacyLinkText: {
    color: '#E8F7FF',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 25, 42, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(123, 224, 174, 0.2)',
  },
  infoBadgeText: {
    color: '#EAF7EF',
    fontSize: 12,
    fontWeight: '700',
  },
  orbLarge: {
    position: 'absolute',
    top: 96,
    right: -36,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(93, 177, 255, 0.18)',
  },
  orbSmall: {
    position: 'absolute',
    top: 258,
    left: -42,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(58, 122, 170, 0.18)',
  },
  card: {
    borderRadius: 30,
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    shadowColor: '#081421',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    gap: 16,
  },
  pinPanel: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D9E5EF',
    gap: 14,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pinIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  pinHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  pinTitle: {
    color: Colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  pinBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  pinInputRow: {
    gap: 12,
  },
  pinInputBlock: {
    gap: 8,
  },
  pinInputWrap: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#D7E1EA',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    paddingVertical: 14,
  },
  biometricChoiceRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#EDF6F1',
    borderWidth: 1,
    borderColor: '#CDEDDD',
  },
  choiceDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.verified,
    backgroundColor: '#FFFFFF',
  },
  choiceDotActive: {
    backgroundColor: Colors.verified,
    borderColor: Colors.verified,
  },
  biometricChoiceText: {
    flex: 1,
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  biometricUnavailableText: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  pinPrimaryButton: {
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
  },
  pinPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  biometricButton: {
    minHeight: 50,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#D4E0EA',
    paddingHorizontal: 16,
  },
  biometricButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  noLockButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 16,
  },
  noLockButtonText: {
    color: '#9A3412',
    fontSize: 14,
    fontWeight: '900',
  },
  noLockHelperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  providedCredentialsButton: {
    minHeight: 44,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F4F7FA',
    paddingHorizontal: 14,
  },
  providedCredentialsText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E6EDF4',
    borderRadius: 18,
    padding: 4,
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#90A4B8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  segmentButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: Colors.text,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: 2,
  },
  inputWrap: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E1EA',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 16,
  },
  visibilityButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FA',
  },
  feedbackCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#166534',
    fontWeight: '600',
  },
  feedbackTextError: {
    color: '#B91C1C',
  },
  submitButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  helperCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#EAF1F7',
    gap: 6,
  },
  helperTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  helperBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  demoHint: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  demoHintValue: {
    color: Colors.text,
    fontWeight: '800' as const,
  },
  supportCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F1',
    gap: 10,
  },
  supportTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  supportBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  supportButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
  },
  supportButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  termsRow: {
    paddingHorizontal: 4,
  },
  termsText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
