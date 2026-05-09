import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticPattern =
  | 'navigate'
  | 'select'
  | 'success'
  | 'warning'
  | 'error'
  | 'delete'
  | 'save'
  | 'emergencyAccess'
  | 'categoryMedications'
  | 'categoryAllergies'
  | 'categoryConditions'
  | 'categoryPersonal'
  | 'categoryDocuments'
  | 'categoryInsurance'
  | 'toggle'
  | 'expand'
  | 'collapse'
  | 'testStrong';

type VibrationNavigator = Navigator & {
  vibrate?: (pattern: number | number[]) => boolean;
};

let hapticEnabled = true;

export function setHapticEnabled(enabled: boolean): void {
  hapticEnabled = enabled;
  console.log('[Haptics] Feedback ' + (enabled ? 'enabled' : 'disabled'));
}

export function isHapticEnabled(): boolean {
  return hapticEnabled;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function triggerWebVibration(pattern: number | number[]): void {
  if (Platform.OS !== 'web') return;

  try {
    const navigatorWithVibration = globalThis.navigator as VibrationNavigator | undefined;
    const didVibrate = navigatorWithVibration?.vibrate?.(pattern) ?? false;
    console.log('[Haptics] Web vibration requested:', didVibrate, pattern);
  } catch (e) {
    console.log('[Haptics] Web vibration unavailable:', e);
  }
}

function getAndroidHaptic(
  name: keyof typeof Haptics.AndroidHaptics,
  fallback: string,
): Haptics.AndroidHaptics {
  const androidHaptics = Haptics.AndroidHaptics as
    | Partial<Record<keyof typeof Haptics.AndroidHaptics, Haptics.AndroidHaptics>>
    | undefined;
  return androidHaptics?.[name] ?? (fallback as Haptics.AndroidHaptics);
}

async function androidHaptic(type: Haptics.AndroidHaptics): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    await Haptics.performAndroidHapticsAsync(type);
    console.log('[Haptics] Android haptic performed:', type);
    return true;
  } catch (e) {
    console.log('[Haptics] Android haptic unavailable:', e);
    return false;
  }
}

async function safeHaptic(fn: () => Promise<void>, webPattern?: number | number[]): Promise<void> {
  if (!hapticEnabled) return;

  if (Platform.OS === 'web' && webPattern) {
    triggerWebVibration(webPattern);
  }

  try {
    await fn();
  } catch (e) {
    console.log('[Haptics] Feedback unavailable:', e);
  }
}

async function impact(style: Haptics.ImpactFeedbackStyle, webPattern: number | number[]): Promise<void> {
  await safeHaptic(() => Haptics.impactAsync(style), webPattern);
}

async function selection(webPattern: number | number[] = 35): Promise<void> {
  await safeHaptic(() => Haptics.selectionAsync(), webPattern);
}

async function notification(type: Haptics.NotificationFeedbackType, webPattern: number | number[]): Promise<void> {
  await safeHaptic(() => Haptics.notificationAsync(type), webPattern);
}

export async function triggerHaptic(pattern: HapticPattern): Promise<void> {
  if (!hapticEnabled) return;

  switch (pattern) {
    case 'navigate':
      if (!(await androidHaptic(getAndroidHaptic('Context_Click', 'context-click')))) {
        await impact(Haptics.ImpactFeedbackStyle.Medium, 45);
      }
      break;

    case 'select':
      if (!(await androidHaptic(getAndroidHaptic('Virtual_Key', 'virtual-key')))) {
        await selection(40);
      }
      break;

    case 'success':
    case 'save':
      if (!(await androidHaptic(getAndroidHaptic('Confirm', 'confirm')))) {
        await notification(Haptics.NotificationFeedbackType.Success, [55, 40, 85]);
      }
      break;

    case 'warning':
      await notification(Haptics.NotificationFeedbackType.Warning, [70, 45, 70, 45, 90]);
      break;

    case 'error':
    case 'delete':
      if (!(await androidHaptic(getAndroidHaptic('Reject', 'reject')))) {
        await notification(Haptics.NotificationFeedbackType.Error, [90, 50, 120, 50, 150]);
      }
      break;

    case 'emergencyAccess':
      await safeHaptic(async () => {
        triggerWebVibration([140, 70, 140, 70, 180, 70, 220]);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await delay(90);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await delay(90);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await delay(90);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      });
      break;

    case 'categoryMedications':
      await safeHaptic(async () => {
        triggerWebVibration([70, 55, 40]);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await delay(75);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      });
      break;

    case 'categoryAllergies':
      await safeHaptic(async () => {
        triggerWebVibration([100, 45, 70, 45, 100]);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await delay(65);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      });
      break;

    case 'categoryConditions':
      await impact(Haptics.ImpactFeedbackStyle.Heavy, 80);
      break;

    case 'categoryPersonal':
      await impact(Haptics.ImpactFeedbackStyle.Medium, 55);
      break;

    case 'categoryDocuments':
      await safeHaptic(async () => {
        triggerWebVibration([55, 80, 55]);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await delay(110);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      });
      break;

    case 'categoryInsurance':
      await safeHaptic(async () => {
        triggerWebVibration([45, 65, 45, 65, 45]);
        await Haptics.selectionAsync();
        await delay(80);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await delay(80);
        await Haptics.selectionAsync();
      });
      break;

    case 'toggle':
      if (!(await androidHaptic(getAndroidHaptic('Toggle_On', 'toggle-on')))) {
        await impact(Haptics.ImpactFeedbackStyle.Medium, 55);
      }
      break;

    case 'expand':
      await impact(Haptics.ImpactFeedbackStyle.Medium, 55);
      break;

    case 'collapse':
      await selection(35);
      break;

    case 'testStrong':
      await safeHaptic(async () => {
        triggerWebVibration([120, 70, 120, 70, 180]);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await delay(90);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await delay(90);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      });
      break;

    default:
      await selection();
      break;
  }
}

export const HAPTIC_PATTERN_DESCRIPTIONS: Record<HapticPattern, string> = {
  navigate: 'Medium tap — moving between screens',
  select: 'Clear selection pulse — choosing an option',
  success: 'Confirmation pulse — record saved successfully',
  warning: 'Repeated caution pulse — attention needed',
  error: 'Strong alert pulse — something went wrong',
  delete: 'Strong alert pulse — destructive action',
  save: 'Confirmation pulse — data saved',
  emergencyAccess: 'Long urgent sequence — entering emergency mode',
  categoryMedications: 'Heavy then medium — medications section',
  categoryAllergies: 'Warning then heavy — allergies section',
  categoryConditions: 'Single heavy — conditions section',
  categoryPersonal: 'Single medium — personal info section',
  categoryDocuments: 'Double medium — documents section',
  categoryInsurance: 'Triple stepped pulse — insurance section',
  toggle: 'Medium tap — toggling a setting',
  expand: 'Medium tap — expanding a section',
  collapse: 'Selection pulse — collapsing a section',
  testStrong: 'Strong test sequence — confirms haptics are enabled',
};
