import { Platform, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import Colors from '@/constants/colors';

export const PRIVACY_POLICY_URL = 'https://myrecordsmyhealth.com/privacy-policy/';

/**
 * Opens the public MyRecordsMyHealth privacy policy from any screen.
 */
export async function openPrivacyPolicy(): Promise<boolean> {
  console.log('[Privacy] Opening privacy policy URL:', PRIVACY_POLICY_URL);
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const newWindow = window.open(PRIVACY_POLICY_URL, '_blank', 'noopener,noreferrer');
        if (newWindow) {
          return true;
        }
        window.location.assign(PRIVACY_POLICY_URL);
        return true;
      }
      await Linking.openURL(PRIVACY_POLICY_URL);
      return true;
    }

    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL, {
      toolbarColor: Colors.primary,
      controlsColor: Colors.white,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'close',
    });
    return true;
  } catch (error) {
    console.error('[Privacy] Failed to open privacy policy:', error);
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
      return true;
    } catch (fallbackError) {
      console.error('[Privacy] Fallback Linking also failed:', fallbackError);
      return false;
    }
  }
}
