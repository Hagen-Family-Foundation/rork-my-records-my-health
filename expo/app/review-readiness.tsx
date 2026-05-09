import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { Text } from '@/components/ScaledText';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldCheck,
  Lock,
  Accessibility,
  FileSearch,
  Download,
  Heart,
  AlertTriangle,
  CheckCircle,
  Eye,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import APP_CONFIG from '@/constants/appConfig';
import { PRIVACY_POLICY_URL, openPrivacyPolicy } from '@/utils/privacy';

type ReviewStatus = 'ready' | 'manual';

interface ReviewItem {
  id: string;
  title: string;
  detail: string;
  status: ReviewStatus;
  route?: string;
  actionLabel?: string;
  icon: 'security' | 'accessibility' | 'integrity' | 'audit' | 'share' | 'emergency';
}

const FOUNDATION_ITEMS: ReviewItem[] = [
  {
    id: 'security',
    title: 'Biometric lock, auto-lock, and screenshot advisory are present',
    detail: 'Reviewers can verify app protection flows directly inside Security settings.',
    status: 'ready',
    route: '/security-settings',
    actionLabel: 'Open Security',
    icon: 'security',
  },
  {
    id: 'accessibility',
    title: 'Accessibility controls are surfaced in-app',
    detail: 'High contrast, large text, reduced motion, haptics, and screen reader support already help users with low vision, blindness, and other accessibility needs.',
    status: 'ready',
    route: '/accessibility-settings',
    actionLabel: 'Open Accessibility',
    icon: 'accessibility',
  },
  {
    id: 'integrity',
    title: 'Encryption and data-integrity verification are visible',
    detail: 'AES-256-GCM messaging and a dedicated integrity check strengthen reviewer confidence.',
    status: 'ready',
    route: '/integrity-check',
    actionLabel: 'Run Integrity Check',
    icon: 'integrity',
  },
  {
    id: 'audit',
    title: 'Audit logging exists for record access and changes',
    detail: 'This supports trust, user control, and medical-record transparency during review.',
    status: 'ready',
    route: '/audit-log',
    actionLabel: 'Open Audit Log',
    icon: 'audit',
  },
  {
    id: 'share',
    title: 'Users can export and review their own data',
    detail: 'Sharing and export flows help demonstrate user control and practical utility.',
    status: 'ready',
    route: '/share',
    actionLabel: 'Open Share & Export',
    icon: 'share',
  },
  {
    id: 'emergency',
    title: 'Minimum functionality is clear beyond simple data storage',
    detail: 'Emergency mode and the wallet card make the app useful in urgent, real-world situations.',
    status: 'ready',
    route: '/wallet-card',
    actionLabel: 'Open Wallet Card',
    icon: 'emergency',
  },
];

const READY_PRIVACY_POLICY = {
  id: 'privacy-policy',
  title: 'Public privacy policy is live',
  detail: 'Privacy policy is hosted on Cloudflare Pages and linked from Settings, Sign-in, Onboarding, Share, and Data Import.',
  actionLabel: 'Open Privacy Policy',
};

const MANUAL_ITEMS: ReviewItem[] = [
  {
    id: 'support-contact',
    title: 'Publish support contact details',
    detail: 'Use a real support email or support page that reviewers can access without signing in.',
    status: 'manual',
    icon: 'audit',
  },
  {
    id: 'truthful-metadata',
    title: 'Make screenshots and descriptions match the shipped build exactly',
    detail: 'Keep “coming soon” features clearly labeled and avoid implying cloud sync, diagnosis, or provider integration.',
    status: 'manual',
    icon: 'share',
  },
  {
    id: 'reviewer-notes',
    title: 'Add reviewer notes about offline-first health records',
    detail: 'Explain that data stays on-device by default, the app is patient-controlled, it does not provide medical advice, and accessibility features broaden safe usability.',
    status: 'manual',
    icon: 'security',
  },
  {
    id: 'content-disclosures',
    title: 'Verify content rating, medical claims, and platform disclosures',
    detail: 'Be conservative with health claims and only disclose capabilities the app actually uses today.',
    status: 'manual',
    icon: 'accessibility',
  },
];

function getStatusColors(status: ReviewStatus) {
  if (status === 'ready') {
    return {
      backgroundColor: Colors.verifiedLight,
      borderColor: Colors.verifiedBorder,
      textColor: Colors.verified,
    };
  }

  return {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warningBorder,
    textColor: Colors.warning,
  };
}

function renderItemIcon(icon: ReviewItem['icon'], color: string) {
  switch (icon) {
    case 'security':
      return <Lock color={color} size={18} />;
    case 'accessibility':
      return <Accessibility color={color} size={18} />;
    case 'integrity':
      return <ShieldCheck color={color} size={18} />;
    case 'audit':
      return <FileSearch color={color} size={18} />;
    case 'share':
      return <Download color={color} size={18} />;
    case 'emergency':
      return <Heart color={color} size={18} />;
    default:
      return <ShieldCheck color={color} size={18} />;
  }
}

const ReviewCard = memo(function ReviewCard({ item, onPress }: { item: ReviewItem; onPress: (route?: string) => void }) {
  const statusColors = getStatusColors(item.status);
  const isPressable = Boolean(item.route);

  const cardContent = (
    <View style={styles.reviewCardInner}>
      <View style={[styles.reviewIconWrap, { backgroundColor: statusColors.backgroundColor }]}>
        {renderItemIcon(item.icon, statusColors.textColor)}
      </View>
      <View style={styles.reviewTextWrap}>
        <View style={styles.reviewTitleRow}>
          <Text style={styles.reviewTitle}>{item.title}</Text>
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: statusColors.backgroundColor,
                borderColor: statusColors.borderColor,
              },
            ]}
          >
            {item.status === 'ready' ? (
              <CheckCircle color={statusColors.textColor} size={12} />
            ) : (
              <AlertTriangle color={statusColors.textColor} size={12} />
            )}
            <Text style={[styles.statusChipText, { color: statusColors.textColor }]}>
              {item.status === 'ready' ? 'Ready' : 'Manual'}
            </Text>
          </View>
        </View>
        <Text style={styles.reviewDetail}>{item.detail}</Text>
        {isPressable ? <Text style={styles.reviewAction}>{item.actionLabel ?? 'Open'}</Text> : null}
      </View>
    </View>
  );

  if (!isPressable) {
    return <View style={styles.reviewCard}>{cardContent}</View>;
  }

  return (
    <TouchableOpacity
      style={styles.reviewCard}
      onPress={() => onPress(item.route)}
      activeOpacity={0.82}
      testID={String('review-item-' + item.id)}
    >
      {cardContent}
    </TouchableOpacity>
  );
});

export default function ReviewReadinessScreen() {
  if (!__DEV__) {
    return <Redirect href="/settings" />;
  }

  const handleNavigate = useCallback((route?: string) => {
    if (!route) {
      return;
    }

    router.push(route as never);
  }, []);

  const handleOpenPrivacyPolicy = useCallback(() => {
    void openPrivacyPolicy();
  }, []);

  const summary = useMemo(() => {
    return {
      readyCount: FOUNDATION_ITEMS.filter((item) => item.status === 'ready').length + 1,
      manualCount: MANUAL_ITEMS.filter((item) => item.status === 'manual').length,
    };
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#0F2640', '#1E3A5F', '#335D89']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Eye color="#D7E9FF" size={14} />
            <Text style={styles.heroBadgeText}>Store Review</Text>
          </View>
          <Text style={styles.heroVersion}>v{APP_CONFIG.version}</Text>
        </View>
        <Text style={styles.heroTitle}>{APP_CONFIG.name + ' is close to review-ready'}</Text>
        <Text style={styles.heroSubtitle}>
          {'The app already shows strong trust, privacy, accessibility, and real-world utility. Its inclusive design helps people with low vision, blindness, and other health or accessibility needs use it more confidently.'}
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatNumber}>{String(summary.readyCount)}</Text>
            <Text style={styles.heroStatLabel}>In-app strengths</Text>
          </View>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatNumber}>{String(summary.manualCount)}</Text>
            <Text style={styles.heroStatLabel}>Manual checks</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionLabel}>ALREADY STRONG FOR REVIEW</Text>
        <View style={styles.sectionCard}>
          {FOUNDATION_ITEMS.map((item) => (
            <ReviewCard key={item.id} item={item} onPress={handleNavigate} />
          ))}
          <TouchableOpacity
            style={styles.privacyPolicyCard}
            onPress={handleOpenPrivacyPolicy}
            activeOpacity={0.85}
            testID="review-privacy-policy-card"
          >
            <View style={styles.reviewCardInner}>
              <View style={[styles.reviewIconWrap, { backgroundColor: Colors.verifiedLight }]}>
                <ShieldCheck color={Colors.verified} size={18} />
              </View>
              <View style={styles.reviewTextWrap}>
                <View style={styles.reviewTitleRow}>
                  <Text style={styles.reviewTitle}>{READY_PRIVACY_POLICY.title}</Text>
                  <View style={[styles.statusChip, { backgroundColor: Colors.verifiedLight, borderColor: Colors.verifiedBorder }]}>
                    <CheckCircle color={Colors.verified} size={12} />
                    <Text style={[styles.statusChipText, { color: Colors.verified }]}>Ready</Text>
                  </View>
                </View>
                <Text style={styles.reviewDetail}>{READY_PRIVACY_POLICY.detail}</Text>
                <View style={styles.privacyUrlChip}>
                  <Text style={styles.privacyUrlText} numberOfLines={1}>{PRIVACY_POLICY_URL}</Text>
                </View>
                <Text style={styles.reviewAction}>{READY_PRIVACY_POLICY.actionLabel}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionLabel}>MANUAL BEFORE SUBMISSION</Text>
        <View style={styles.sectionCard}>
          {MANUAL_ITEMS.map((item) => (
            <ReviewCard key={item.id} item={item} onPress={handleNavigate} />
          ))}
        </View>
      </View>

      <View style={styles.dualNoteRow}>
        <View style={styles.platformCard}>
          <Text style={styles.platformTitle}>Apple review focus</Text>
          <Text style={styles.platformBody}>{'Keep medical positioning conservative, explain that this is not diagnosis or treatment, and note that built-in accessibility options improve usability for more people.'}</Text>
        </View>
        <View style={styles.platformCard}>
          <Text style={styles.platformTitle}>Microsoft review focus</Text>
          <Text style={styles.platformBody}>{'Provide a clear privacy statement, support contact, accurate capability disclosures, and mention accessibility support as a practical product strength.'}</Text>
        </View>
      </View>

      <LinearGradient
        colors={['#FFF8E8', '#FFF3D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.notesCard}
      >
        <View style={styles.notesHeader}>
          <AlertTriangle color={Colors.warning} size={18} />
          <Text style={styles.notesTitle}>Suggested reviewer note</Text>
        </View>
        <Text style={styles.notesBody}>{APP_CONFIG.name + ' is a patient-controlled emergency health record app. Records are stored locally on-device and protected with encryption. The app does not provide medical diagnosis, treatment recommendations, or background cloud syncing. It also includes accessibility features such as large text, high contrast, reduced motion, screen reader support, and haptic cues to better support users with low vision, blindness, and other accessibility needs. Any future interoperability features remain clearly labeled and gated until released.'}</Text>
      </LinearGradient>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Best next move</Text>
        <Text style={styles.footerText}>{'Finish the public-facing privacy/support materials, then use this screen plus Security, Accessibility, Integrity Check, Share, and Emergency Wallet Card as your internal review walkthrough.'}</Text>
      </View>

      <View style={styles.bottomSpacer} />
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
    gap: 18,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    gap: 14,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#0F2640',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.18,
          shadowRadius: 22,
        }
      : {
          elevation: 10,
        }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: '#D7E9FF',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  heroVersion: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  heroTitle: {
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.76)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  heroStatNumber: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.66)',
    fontWeight: '600' as const,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    color: Colors.textTertiary,
    paddingLeft: 4,
  },
  sectionCard: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  reviewCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  reviewIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTextWrap: {
    flex: 1,
    gap: 8,
  },
  reviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reviewDetail: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  reviewAction: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  dualNoteRow: {
    gap: 12,
  },
  platformCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  platformTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  platformBody: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  notesCard: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F6DE99',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  notesBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6F5500',
  },
  footerCard: {
    backgroundColor: '#EDF3F9',
    borderRadius: 20,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D2DFEC',
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.primaryDark,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.primary,
  },
  bottomSpacer: {
    height: 24,
  },
  privacyPolicyCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
    overflow: 'hidden',
  },
  privacyUrlChip: {
    backgroundColor: Colors.verifiedLight,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  privacyUrlText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.verified,
    letterSpacing: 0.2,
  },
});
