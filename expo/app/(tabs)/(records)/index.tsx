import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ScaledText';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Phone,
  AlertTriangle,
  Pill,
  Activity,
  Stethoscope,
  Shield,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Camera,
  Lock,
  ShieldCheck,
  LogOut,
} from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { useAuth } from '@/providers/AuthProvider';
import Colors from '@/constants/colors';
import { interpolate, usePhraseSet } from '@/localization/runtime';
import { formatRelativeTime, isStale } from '@/utils/format';
import { triggerHaptic } from '@/utils/haptics';
import ProgressRing from '@/components/ProgressRing';

interface CollapsibleCategoryProps {
  icon: React.ReactNode;
  title: string;
  itemCount: number;
  badge?: 'verified' | 'stale' | 'alert';
  lastUpdated?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  children: React.ReactNode;
  testID: string;
  emptyLabel: string;
  verifiedLabel: string;
  staleLabel: string;
  expandHint: string;
  collapseHint: string;
  editLabel: string;
}

const CollapsibleCategory = React.memo(function CollapsibleCategory({
  icon,
  title,
  itemCount,
  badge,
  lastUpdated,
  isExpanded,
  onToggle,
  onEdit,
  children,
  testID,
  emptyLabel,
  verifiedLabel,
  staleLabel,
  expandHint,
  collapseHint,
  editLabel,
}: CollapsibleCategoryProps) {
  return (
    <View style={styles.categoryCard}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        testID={testID}
        accessibilityLabel={title + ', ' + String(itemCount)}
        accessibilityHint={isExpanded ? collapseHint : expandHint}
        accessibilityState={{ expanded: isExpanded }}
        accessibilityRole="button"
      >
        <View style={styles.categoryIcon}>{icon}</View>
        <View style={styles.categoryMeta}>
          <Text style={styles.categoryTitle}>{title}</Text>
          <View style={styles.categoryInfoRow}>
            {itemCount > 0 ? (
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>{String(itemCount)}</Text>
              </View>
            ) : (
              <Text style={styles.emptyLabel}>{emptyLabel}</Text>
            )}
            {badge === 'verified' ? (
              <View style={styles.verifiedBadge}>
                <CheckCircle color={Colors.verified} size={11} />
                <Text style={styles.verifiedText}>{verifiedLabel}</Text>
              </View>
            ) : null}
            {badge === 'stale' ? (
              <View style={styles.staleBadge}>
                <Clock color={Colors.warning} size={11} />
                <Text style={styles.staleText}>{staleLabel}</Text>
              </View>
            ) : null}
            {badge === 'alert' ? (
              <View style={styles.alertBadge}>
                <AlertTriangle color={Colors.emergency} size={11} />
              </View>
            ) : null}
            {lastUpdated ? <Text style={styles.lastUpdatedMini}>{String(formatRelativeTime(lastUpdated))}</Text> : null}
          </View>
        </View>
        {isExpanded ? <ChevronUp color={Colors.textTertiary} size={18} /> : <ChevronDown color={Colors.textTertiary} size={18} />}
      </TouchableOpacity>
      {isExpanded ? (
        <View style={styles.categoryBody}>
          <View style={styles.categoryContent}>{children}</View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={onEdit}
            activeOpacity={0.7}
            testID={String(testID + '-edit')}
            accessibilityLabel={editLabel + ' ' + title}
            accessibilityRole="button"
          >
            <Text style={styles.editBtnText}>{editLabel}</Text>
            <ChevronRight color={Colors.primary} size={14} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
});

function getGreeting(hour: number, copy: { greetingMorning: string; greetingAfternoon: string; greetingEvening: string }): string {
  if (hour < 12) return copy.greetingMorning;
  if (hour < 17) return copy.greetingAfternoon;
  return copy.greetingEvening;
}

function getCompletionProgress(record: {
  personalInfo: { firstName: string; lastName: string; bloodType: string; dateOfBirth: string; phone: string };
  emergencyContacts: unknown[];
  allergies: unknown[];
  medications: unknown[];
  conditions: unknown[];
  procedures: unknown[];
  insurance: { provider: string };
  emergencyNotes: { content: string };
  documents: unknown[];
}): { filled: number; total: number } {
  let filled = 0;
  const total = 9;
  if (record.personalInfo.firstName || record.personalInfo.lastName) filled++;
  if (record.personalInfo.bloodType) filled++;
  if (record.emergencyContacts.length > 0) filled++;
  if (record.allergies.length > 0) filled++;
  if (record.medications.length > 0) filled++;
  if (record.conditions.length > 0) filled++;
  if (record.insurance.provider) filled++;
  if (record.emergencyNotes.content) filled++;
  if (record.documents.length > 0) filled++;
  return { filled, total };
}

export default function RecordsScreen() {
  const { record } = useHealthRecords();
  const { signOut, isSigningOut, user } = useAuth();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const heroFadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlideAnim = useRef(new Animated.Value(12)).current;
  const copy = usePhraseSet({
    emptyLabel: 'None',
    verified: 'Verified',
    stale: 'Stale',
    expandHint: 'Double tap to expand',
    collapseHint: 'Double tap to collapse',
    edit: 'Edit',
    greetingMorning: 'Good Morning',
    greetingAfternoon: 'Good Afternoon',
    greetingEvening: 'Good Evening',
    welcome: 'Welcome',
    encryptedSecure: 'Encrypted & Secure',
    ofLabel: 'of {total}',
    sectionsNeedInfo: '{count} sections still need your info',
    allSectionsComplete: 'All sections complete',
    privacyBanner: 'Tap any category to view details. All sections are collapsed for your privacy.',
    clinicalDisclaimerTitle: 'Clinical Disclaimer',
    clinicalDisclaimerPreview: 'Important: this app stores user-managed health information and does not provide medical advice.',
    clinicalDisclaimerOne:
      'MyRecordsMyHealth is a patient-controlled record-keeping and emergency information tool. It does not provide medical advice, diagnosis, or treatment recommendations.',
    clinicalDisclaimerTwo:
      'Always seek the advice of your physician or other qualified health provider with any questions about a medical condition, medication changes, or treatment decisions.',
    clinicalDisclaimerThree:
      'Information in this app is user-provided unless explicitly labeled with its source. Medical professionals should verify information with the patient when possible.',
    groupGettingStarted: 'GETTING STARTED',
    groupPersonal: 'PERSONAL',
    groupMedical: 'MEDICAL',
    groupDocuments: 'DOCUMENTS',
    groupOther: 'OTHER',
    personalInfo: 'Personal Information',
    emergencyContacts: 'Emergency Contacts',
    allergies: 'Allergies',
    medications: 'Medications',
    currentConditions: 'Current Conditions',
    procedureHistory: 'Procedure History',
    criticalDocuments: 'Critical Documents',
    insurance: 'Insurance',
    notes: 'Notes',
    userManual: '1. User Manual',
    userManualSubtitle: 'Step-by-step guide to using your records',
    userManualAccessibilityHint: 'Open the user manual and operating instructions guide',
    bloodType: 'Blood Type',
    dob: 'DOB',
    phone: 'Phone',
    religiousPreference: 'Religious Preference',
    noPersonalInfo: 'No personal information added yet.',
    noEmergencyContacts: 'No emergency contacts added yet.',
    noAllergies: 'No allergies recorded.',
    noMedications: 'No medications recorded.',
    noConditions: 'No current conditions recorded.',
    noProcedures: 'No procedures recorded.',
    noDocuments: 'No documents uploaded.',
    noInsurance: 'No insurance information added.',
    noNotes: 'No notes added.',
    discontinuedCount: '+{count} discontinued',
    lastVerified: 'Last verified: {time}',
    diagnosed: 'Diagnosed',
    noDate: 'No date',
    memberId: 'Member ID',
    policy: 'Policy',
    lastUpdated: 'Last updated: {time}',
    severityMild: 'Mild',
    severityModerate: 'Moderate',
    severitySevere: 'Severe',
    severityLifeThreatening: 'Life-threatening',
    signOutTitle: 'Sign Out',
    signOutConfirm: 'Are you sure you want to sign out? You will need to sign back in to access your records.',
    signOutDoubleCheckTitle: 'Really sign out?',
    signOutDoubleCheckMessage: 'This will end your session on this device. Continue?',
    signOutButton: 'Sign Out',
    signOutCancel: 'Cancel',
    signOutErrorTitle: 'Error',
    signOutErrorMessage: 'Unable to sign out right now.',
  });

  const handleSignOut = useCallback(() => {
    void triggerHaptic('warning');
    Alert.alert(copy.signOutTitle, copy.signOutConfirm, [
      { text: copy.signOutCancel, style: 'cancel' },
      {
        text: copy.signOutButton,
        style: 'destructive',
        onPress: () => {
          Alert.alert(copy.signOutDoubleCheckTitle, copy.signOutDoubleCheckMessage, [
            { text: copy.signOutCancel, style: 'cancel' },
            {
              text: copy.signOutButton,
              style: 'destructive',
              onPress: async () => {
                try {
                  await signOut();
                  console.log('[Records] Sign out complete for:', user?.email ?? 'unknown');
                } catch (error) {
                  console.error('[Records] Sign out failed:', error);
                  Alert.alert(copy.signOutErrorTitle, copy.signOutErrorMessage);
                }
              },
            },
          ]);
        },
      },
    ]);
  }, [copy.signOutButton, copy.signOutCancel, copy.signOutConfirm, copy.signOutDoubleCheckMessage, copy.signOutDoubleCheckTitle, copy.signOutErrorMessage, copy.signOutErrorTitle, copy.signOutTitle, signOut, user?.email]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroSlideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [heroFadeAnim, heroSlideAnim]);

  const toggleCategory = useCallback((key: string) => {
    setExpanded((prev) => {
      const willExpand = !prev[key];
      void triggerHaptic(willExpand ? 'expand' : 'collapse');
      return { ...prev, [key]: willExpand };
    });
  }, []);

  const handleOpenUserManual = useCallback(() => {
    void triggerHaptic('navigate');
    router.push('/user-manual');
  }, []);

  const translateSeverity = useCallback(
    (severity: string) => {
      switch (severity) {
        case 'mild':
          return copy.severityMild;
        case 'moderate':
          return copy.severityModerate;
        case 'severe':
          return copy.severitySevere;
        case 'life-threatening':
          return copy.severityLifeThreatening;
        default:
          return severity;
      }
    },
    [copy.severityLifeThreatening, copy.severityMild, copy.severityModerate, copy.severitySevere]
  );

  const activeMedCount = record.medications.filter((medication) => medication.status !== 'discontinued').length;
  const medStale = isStale(record.medicationVerification.lastVerifiedAt, 30);
  const hasCriticalAllergies = record.allergies.some(
    (allergy) => allergy.severity === 'life-threatening' || allergy.severity === 'severe'
  );
  const currentConditions = record.conditions;

  const greeting = useMemo(() => getGreeting(new Date().getHours(), copy), [copy]);
  const firstName = record.personalInfo.firstName;
  const progress = useMemo(() => getCompletionProgress(record), [record]);
  const progressPercent = progress.total > 0 ? progress.filled / progress.total : 0;
  const isComplete = progress.filled === progress.total;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: heroFadeAnim, transform: [{ translateY: heroSlideAnim }] }}>
        <LinearGradient
          colors={['#1E3A5F', '#2A5080', '#1E3A5F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroBrandPill}>
              <ShieldCheck color="#6FD5A6" size={12} />
              <Text style={styles.heroBrandPillText}>{copy.encryptedSecure}</Text>
            </View>
            <TouchableOpacity
              onPress={handleSignOut}
              disabled={isSigningOut}
              style={[styles.heroSignOutBtn, isSigningOut && styles.heroSignOutBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={copy.signOutButton}
              accessibilityHint={copy.signOutConfirm}
              testID="records-sign-out"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <LogOut color="#FFFFFF" size={14} />
              <Text style={styles.heroSignOutText}>{copy.signOutButton}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroContent}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreeting}>{greeting}</Text>
              <Text style={styles.heroName}>{firstName ? firstName : copy.welcome}</Text>
            </View>
            <View style={styles.heroRingWrapper}>
              <ProgressRing
                progress={progressPercent}
                size={68}
                strokeWidth={5}
                color={isComplete ? '#6FD5A6' : '#4A90D9'}
                trackColor="rgba(255,255,255,0.15)"
              >
                <Text style={styles.heroRingText}>{String(progress.filled)}</Text>
                <Text style={styles.heroRingLabel}>{interpolate(copy.ofLabel, { total: progress.total })}</Text>
              </ProgressRing>
            </View>
          </View>
          {!isComplete ? (
            <View style={styles.heroHintRow}>
              <View style={styles.heroHintDot} />
              <Text style={styles.heroHintText}>{interpolate(copy.sectionsNeedInfo, { count: progress.total - progress.filled })}</Text>
            </View>
          ) : (
            <View style={styles.heroHintRow}>
              <CheckCircle color="#6FD5A6" size={12} />
              <Text style={[styles.heroHintText, { color: '#6FD5A6' }]}>{copy.allSectionsComplete}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      <View style={styles.privacyBanner}>
        <View style={styles.privacyBannerIcon}>
          <Lock color={Colors.primary} size={14} />
        </View>
        <Text style={styles.privacyBannerText}>{copy.privacyBanner}</Text>
      </View>

      <View style={styles.disclaimerCard} testID="records-clinical-disclaimer-card">
        <TouchableOpacity
          style={styles.disclaimerHeader}
          onPress={() => toggleCategory('clinicalDisclaimer')}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={copy.clinicalDisclaimerTitle}
          accessibilityHint={expanded.clinicalDisclaimer ? copy.collapseHint : copy.expandHint}
          accessibilityState={{ expanded: !!expanded.clinicalDisclaimer }}
          testID="records-clinical-disclaimer-toggle"
        >
          <View style={styles.disclaimerIconWrap}>
            <AlertTriangle color={Colors.warning} size={16} />
          </View>
          <View style={styles.disclaimerCopyWrap}>
            <Text style={styles.disclaimerTitle}>{copy.clinicalDisclaimerTitle}</Text>
            <Text style={styles.disclaimerPreview}>{copy.clinicalDisclaimerPreview}</Text>
          </View>
          {expanded.clinicalDisclaimer ? (
            <ChevronUp color={Colors.textTertiary} size={18} />
          ) : (
            <ChevronDown color={Colors.textTertiary} size={18} />
          )}
        </TouchableOpacity>
        {expanded.clinicalDisclaimer ? (
          <View style={styles.disclaimerBody} testID="records-clinical-disclaimer-body">
            <Text style={styles.disclaimerText}>{copy.clinicalDisclaimerOne}</Text>
            <Text style={styles.disclaimerText}>{copy.clinicalDisclaimerTwo}</Text>
            <Text style={styles.disclaimerText}>{copy.clinicalDisclaimerThree}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">{copy.groupGettingStarted}</Text>
        <TouchableOpacity
          style={styles.manualActionCard}
          onPress={handleOpenUserManual}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={copy.userManual}
          accessibilityHint={copy.userManualAccessibilityHint}
          testID="records-user-manual"
        >
          <View style={styles.categoryIcon}>
            <FileText color={Colors.primary} size={20} />
          </View>
          <View style={styles.categoryMeta}>
            <Text style={styles.categoryTitle}>{copy.userManual}</Text>
            <Text style={styles.manualActionSubtitle}>{copy.userManualSubtitle}</Text>
          </View>
          <ChevronRight color={Colors.textTertiary} size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">{copy.groupPersonal}</Text>
        <CollapsibleCategory
          icon={<User color={Colors.primary} size={20} />}
          title={copy.personalInfo}
          itemCount={record.personalInfo.firstName || record.personalInfo.lastName ? 1 : 0}
          lastUpdated={record.lastUpdated}
          isExpanded={!!expanded.personal}
          onToggle={() => toggleCategory('personal')}
          onEdit={() => router.push('/edit-personal')}
          testID="cat-personal"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.personalInfo.firstName || record.personalInfo.lastName ? (
            <View style={styles.detailRows}>
              <Text style={styles.detailPrimary}>{String((record.personalInfo.firstName + ' ' + record.personalInfo.lastName).trim())}</Text>
              {record.personalInfo.bloodType ? <Text style={styles.detailSecondary}>{copy.bloodType + ': ' + record.personalInfo.bloodType}</Text> : null}
              {record.personalInfo.dateOfBirth ? <Text style={styles.detailSecondary}>{copy.dob + ': ' + record.personalInfo.dateOfBirth}</Text> : null}
              {record.personalInfo.phone ? <Text style={styles.detailSecondary}>{copy.phone + ': ' + record.personalInfo.phone}</Text> : null}
              {record.personalInfo.religiousPreference ? <Text style={styles.detailSecondary}>{copy.religiousPreference + ': ' + record.personalInfo.religiousPreference}</Text> : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noPersonalInfo}</Text>
          )}
        </CollapsibleCategory>

        <CollapsibleCategory
          icon={<Phone color={Colors.primary} size={20} />}
          title={copy.emergencyContacts}
          itemCount={record.emergencyContacts.length}
          isExpanded={!!expanded.contacts}
          onToggle={() => toggleCategory('contacts')}
          onEdit={() => router.push('/edit-contacts')}
          testID="cat-contacts"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.emergencyContacts.length > 0 ? (
            <View style={styles.detailRows}>
              {record.emergencyContacts.map((contact) => (
                <View key={contact.id} style={styles.listItem}>
                  <Text style={styles.detailPrimary}>{String(contact.name + (contact.isPrimary ? ' ★' : ''))}</Text>
                  <Text style={styles.detailSecondary}>{String(contact.relationship + ' • ' + contact.phone)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noEmergencyContacts}</Text>
          )}
        </CollapsibleCategory>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">{copy.groupMedical}</Text>
        <CollapsibleCategory
          icon={<AlertTriangle color={hasCriticalAllergies ? Colors.emergency : Colors.primary} size={20} />}
          title={copy.allergies}
          itemCount={record.allergies.length}
          badge={hasCriticalAllergies ? 'alert' : undefined}
          isExpanded={!!expanded.allergies}
          onToggle={() => toggleCategory('allergies')}
          onEdit={() => router.push('/edit-allergies')}
          testID="cat-allergies"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.allergies.length > 0 ? (
            <View style={styles.detailRows}>
              {record.allergies.map((allergy) => (
                <View key={allergy.id} style={styles.listItem}>
                  <Text style={styles.detailPrimary}>{String(allergy.name)}</Text>
                  <Text style={[styles.detailSecondary, allergy.severity === 'severe' || allergy.severity === 'life-threatening' ? styles.alertText : undefined]}>
                    {translateSeverity(allergy.severity) + (allergy.reaction ? ' — ' + allergy.reaction : '')}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noAllergies}</Text>
          )}
        </CollapsibleCategory>

        <CollapsibleCategory
          icon={<Pill color={Colors.primary} size={20} />}
          title={copy.medications}
          itemCount={activeMedCount}
          badge={activeMedCount > 0 ? (medStale ? 'stale' : 'verified') : undefined}
          isExpanded={!!expanded.medications}
          onToggle={() => toggleCategory('medications')}
          onEdit={() => router.push('/edit-medications')}
          testID="cat-medications"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.medications.length > 0 ? (
            <View style={styles.detailRows}>
              {record.medications.filter((medication) => medication.status !== 'discontinued').map((medication) => (
                <View key={medication.id} style={styles.listItem}>
                  <Text style={styles.detailPrimary}>{String(medication.name)}</Text>
                  <Text style={styles.detailSecondary}>{String(medication.dosage + ' — ' + medication.frequency)}</Text>
                </View>
              ))}
              {record.medications.filter((medication) => medication.status === 'discontinued').length > 0 ? (
                <Text style={styles.mutedNote}>{interpolate(copy.discontinuedCount, { count: record.medications.filter((medication) => medication.status === 'discontinued').length })}</Text>
              ) : null}
              <View style={styles.verificationRow}>
                <Clock color={Colors.textTertiary} size={12} />
                <Text style={styles.verificationText}>{interpolate(copy.lastVerified, { time: formatRelativeTime(record.medicationVerification.lastVerifiedAt) })}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noMedications}</Text>
          )}
        </CollapsibleCategory>

        <CollapsibleCategory
          icon={<Activity color={Colors.primary} size={20} />}
          title={copy.currentConditions}
          itemCount={currentConditions.length}
          isExpanded={!!expanded.conditions}
          onToggle={() => toggleCategory('conditions')}
          onEdit={() => router.push('/edit-conditions')}
          testID="cat-conditions"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {currentConditions.length > 0 ? (
            <View style={styles.detailRows}>
              {currentConditions.map((condition) => (
                <View key={condition.id} style={styles.listItem}>
                  <Text style={styles.detailPrimary}>{String(condition.name)}</Text>
                  {condition.diagnosedDate ? <Text style={styles.detailSecondary}>{copy.diagnosed + ': ' + condition.diagnosedDate}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noConditions}</Text>
          )}
        </CollapsibleCategory>

        <CollapsibleCategory
          icon={<Stethoscope color={Colors.primary} size={20} />}
          title={copy.procedureHistory}
          itemCount={record.procedures.length}
          isExpanded={!!expanded.procedures}
          onToggle={() => toggleCategory('procedures')}
          onEdit={() => router.push('/edit-procedures')}
          testID="cat-procedures"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.procedures.length > 0 ? (
            <View style={styles.detailRows}>
              {record.procedures.map((procedure) => (
                <View key={procedure.id} style={styles.listItem}>
                  <Text style={styles.detailPrimary}>{String(procedure.name)}</Text>
                  <Text style={styles.detailSecondary}>{String((procedure.date || copy.noDate) + (procedure.provider ? ' • ' + procedure.provider : ''))}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noProcedures}</Text>
          )}
        </CollapsibleCategory>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">{copy.groupDocuments}</Text>
        <CollapsibleCategory
          icon={<Camera color={Colors.primary} size={20} />}
          title={copy.criticalDocuments}
          itemCount={record.documents.length}
          isExpanded={!!expanded.documents}
          onToggle={() => toggleCategory('documents')}
          onEdit={() => router.push('/edit-documents')}
          testID="cat-documents"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.documents.length > 0 ? (
            <View style={styles.detailRows}>
              {record.documents.map((document) => (
                <View key={document.id} style={styles.listItem}>
                  <Text style={styles.detailPrimary}>{String(document.label || document.type.replace(/_/g, ' '))}</Text>
                  <Text style={styles.detailSecondary}>{String(document.type.replace(/_/g, ' '))}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noDocuments}</Text>
          )}
        </CollapsibleCategory>
      </View>

      <View style={styles.sectionGroup}>
        <Text style={styles.groupTitle} accessibilityRole="header">{copy.groupOther}</Text>
        <CollapsibleCategory
          icon={<Shield color={Colors.primary} size={20} />}
          title={copy.insurance}
          itemCount={record.insurance.provider ? 1 : 0}
          isExpanded={!!expanded.insurance}
          onToggle={() => toggleCategory('insurance')}
          onEdit={() => router.push('/edit-insurance')}
          testID="cat-insurance"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.insurance.provider ? (
            <View style={styles.detailRows}>
              <Text style={styles.detailPrimary}>{String(record.insurance.provider)}</Text>
              {record.insurance.memberId ? <Text style={styles.detailSecondary}>{copy.memberId + ': ' + record.insurance.memberId}</Text> : null}
              {record.insurance.policyNumber ? <Text style={styles.detailSecondary}>{copy.policy + ': ' + record.insurance.policyNumber}</Text> : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>{copy.noInsurance}</Text>
          )}
        </CollapsibleCategory>

        <CollapsibleCategory
          icon={<FileText color={Colors.primary} size={20} />}
          title={copy.notes}
          itemCount={record.emergencyNotes.content ? 1 : 0}
          isExpanded={!!expanded.notes}
          onToggle={() => toggleCategory('notes')}
          onEdit={() => router.push('/edit-notes')}
          testID="cat-notes"
          emptyLabel={copy.emptyLabel}
          verifiedLabel={copy.verified}
          staleLabel={copy.stale}
          expandHint={copy.expandHint}
          collapseHint={copy.collapseHint}
          editLabel={copy.edit}
        >
          {record.emergencyNotes.content ? <Text style={styles.detailPrimary}>{String(record.emergencyNotes.content)}</Text> : <Text style={styles.emptyText}>{copy.noNotes}</Text>}
        </CollapsibleCategory>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{interpolate(copy.lastUpdated, { time: formatRelativeTime(record.lastUpdated) })}</Text>
      </View>
      <View style={{ height: 24 }} />
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
    gap: 20,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  privacyBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    lineHeight: 17,
  },
  disclaimerCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    overflow: 'hidden',
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  disclaimerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerCopyWrap: {
    flex: 1,
    gap: 3,
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  disclaimerPreview: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  disclaimerBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: Colors.warningLight,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectionGroup: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    paddingLeft: 4,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  manualActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMeta: {
    flex: 1,
    gap: 3,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  categoryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  manualActionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  countChip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    minWidth: 20,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  emptyLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.verifiedLight,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.verified,
  },
  staleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  staleText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  alertBadge: {
    backgroundColor: Colors.emergencyLight,
    borderRadius: 8,
    padding: 2,
  },
  lastUpdatedMini: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  categoryBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  categoryContent: {
    padding: 14,
    paddingTop: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  detailRows: {
    gap: 8,
  },
  listItem: {
    gap: 1,
  },
  detailPrimary: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    lineHeight: 20,
  },
  detailSecondary: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  alertText: {
    color: Colors.emergency,
    fontWeight: '600' as const,
  },
  mutedNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  verificationText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
  },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  heroBrandPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(111,213,166,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroBrandPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#D1FAE5',
    letterSpacing: 0.3,
  },
  heroSignOutBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroSignOutBtnDisabled: {
    opacity: 0.5,
  },
  heroSignOutText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextBlock: {
    flex: 1,
    gap: 2,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  heroStatusText: {
    fontSize: 12,
    color: '#D1FAE5',
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  heroRingWrapper: {
    marginLeft: 12,
  },
  heroRingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800' as const,
    textAlign: 'center',
  },
  heroRingLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginTop: -2,
  },
  heroHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroHintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
  },
  heroHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600' as const,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
