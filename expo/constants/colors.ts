const Colors = {
  primary: '#1E3A5F',
  primaryLight: '#E8EEF4',
  primaryDark: '#0F2640',

  emergency: '#DC2626',
  emergencyLight: '#FEF2F2',
  emergencyBorder: '#FECACA',

  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',

  verified: '#059669',
  verifiedLight: '#ECFDF5',
  verifiedBorder: '#A7F3D0',

  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  background: '#F5F6F8',
  white: '#FFFFFF',
  border: '#E5E7EB',
  divider: '#F0F0F0',

  light: {
    text: '#1A1A2E',
    background: '#F5F6F8',
    tint: '#1E3A5F',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#1E3A5F',
  },
};

export const HighContrastColors = {
  primary: '#0A2444',
  primaryLight: '#D6E4F0',
  primaryDark: '#061A33',

  emergency: '#B91C1C',
  emergencyLight: '#FEE2E2',
  emergencyBorder: '#F87171',

  warning: '#B45309',
  warningLight: '#FEF3C7',
  warningBorder: '#F59E0B',

  verified: '#047857',
  verifiedLight: '#D1FAE5',
  verifiedBorder: '#6EE7B7',

  text: '#000000',
  textSecondary: '#374151',
  textTertiary: '#4B5563',

  background: '#FFFFFF',
  white: '#FFFFFF',
  border: '#9CA3AF',
  divider: '#D1D5DB',

  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#0A2444',
    tabIconDefault: '#4B5563',
    tabIconSelected: '#0A2444',
  },
};

export function getColors(highContrast: boolean): typeof Colors {
  return highContrast ? HighContrastColors : Colors;
}

export default Colors;
