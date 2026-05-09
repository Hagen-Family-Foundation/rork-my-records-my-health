import * as Linking from 'expo-linking';
import APP_CONFIG from '@/constants/appConfig';

export const SUPPORT_EMAIL = 'support@myrecordsmyhealth.com';

interface SupportEmailOptions {
  subject: string;
  body: string;
}

interface SupportIdentity {
  email?: string | null;
  fullName?: string | null;
}

function buildMailtoUrl(to: string, subject: string, body: string): string {
  return 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

export async function openSupportEmail(options: SupportEmailOptions): Promise<boolean> {
  const mailtoUrl = buildMailtoUrl(SUPPORT_EMAIL, options.subject, options.body);

  try {
    await Linking.openURL(mailtoUrl);
    console.log('[SupportEmail] Opened support email composer');
    return true;
  } catch (error) {
    console.error('[SupportEmail] Failed to open support email composer:', error);
    return false;
  }
}

export function buildCommunicationsPreferenceEmail(
  identity: SupportIdentity,
  enabled: boolean
): SupportEmailOptions {
  const safeEmail = identity.email?.trim() || 'Not provided';
  const safeName = identity.fullName?.trim() || 'Not provided';

  return {
    subject: APP_CONFIG.name + (enabled ? ' updates opt-in' : ' updates opt-out'),
    body: [
      'Hello ' + APP_CONFIG.name + ' team,',
      '',
      enabled
        ? 'Please add me to your email updates list for product news, app updates, and important notices.'
        : 'Please remove me from your email updates list for product news, app updates, and important notices.',
      '',
      'Name: ' + safeName,
      'Email: ' + safeEmail,
      '',
      enabled
        ? 'I consent to receive communications at the email address above.'
        : 'Please stop sending communications to the email address above.',
      '',
      'Thank you,',
      safeName,
    ].join('\n'),
  };
}

export function buildGeneralSupportEmail(identity: SupportIdentity): SupportEmailOptions {
  const safeEmail = identity.email?.trim() || '';
  const safeName = identity.fullName?.trim() || '';

  return {
    subject: APP_CONFIG.name + ' support request',
    body: [
      'Hello ' + APP_CONFIG.name + ' team,',
      '',
      'I would like to get in touch about ' + APP_CONFIG.name + '.',
      '',
      'Name: ' + (safeName || 'Not provided'),
      'Email: ' + (safeEmail || 'Not provided'),
      '',
      'Message:',
      '',
    ].join('\n'),
  };
}
