import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Heart,
  Droplets,
  AlertTriangle,
  Pill,
  Phone,
  Activity,
  Camera,
  Info,
} from 'lucide-react-native';
import { Text } from '@/components/ScaledText';
import Colors from '@/constants/colors';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { interpolate, usePhraseSet } from '@/localization/runtime';
import { formatFullName } from '@/utils/format';

export default function WalletCardScreen() {
  const { record } = useHealthRecords();
  const copy = usePhraseSet({
    infoText:
      "For a paper copy, open Emergency View and tap Print Emergency Card to create a wallet-sized card PDF. If AirPrint cannot find a printer, save or share that PDF to Files, AirDrop, email, or your printer app and print from there. You can still screenshot this compact card and keep it in your phone's photo library as a quick backup. The details appear exactly as you entered them, so you can keep names, notes, and care information in the language you choose.",
    headerTitle: 'EMERGENCY MEDICAL INFO',
    dob: 'DOB: {value}',
    bloodType: 'BLOOD TYPE',
    unknown: 'UNKNOWN',
    criticalAllergies: 'CRITICAL ALLERGIES',
    otherAllergies: 'OTHER ALLERGIES',
    currentMedications: 'CURRENT MEDICATIONS',
    conditions: 'CONDITIONS',
    emergencyContact: 'EMERGENCY CONTACT',
    insurance: 'INSURANCE',
    insuranceId: 'ID: {value}',
    religiousPreference: 'RELIGIOUS PREFERENCE',
    disclaimer: 'User-managed information. Verify with patient when possible.',
    tipsTitle: 'Tips',
    tipScreenshot: '• Screenshot this card and save to your Photos',
    tipPrint: '• Open Emergency View and tap Print Emergency Card for a wallet-sized PDF or paper card',
    tipSticker: '• Optional: place a small reminder sticker near the driver door lock or lower-left windshield',
    tipShare: '• Share with your primary care provider',
    tipUpdate: '• Update this card whenever your records change',
    severityMild: 'Mild',
    severityModerate: 'Moderate',
    severitySevere: 'Severe',
    severityLifeThreatening: 'Life-threatening',
  });

  const fullName = formatFullName(record.personalInfo.firstName, record.personalInfo.lastName);
  const criticalAllergies = record.allergies.filter(
    (allergy) => allergy.severity === 'life-threatening' || allergy.severity === 'severe'
  );
  const activeMeds = record.medications.filter((medication) => medication.status !== 'discontinued');
  const primaryContact = record.emergencyContacts.find((contact) => contact.isPrimary) ?? record.emergencyContacts[0];

  const translateSeverity = (severity: string) => {
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
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.infoCard}>
        <Camera color={Colors.primary} size={16} />
        <Text style={styles.infoText}>{copy.infoText}</Text>
      </View>

      <View style={styles.walletCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Heart color="#FFFFFF" size={20} />
            <Text style={styles.cardHeaderTitle}>{copy.headerTitle}</Text>
          </View>
          <Text style={styles.cardHeaderBrand}>MyRecordsMyHealth</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.patientRow}>
            <Text style={styles.patientName}>{fullName}</Text>
            {record.personalInfo.dateOfBirth ? (
              <Text style={styles.patientDob}>{interpolate(copy.dob, { value: record.personalInfo.dateOfBirth })}</Text>
            ) : null}
          </View>

          <View style={styles.bloodTypeRow}>
            <Droplets color={Colors.white} size={18} />
            <Text style={styles.bloodTypeLabel}>{copy.bloodType}</Text>
            <Text style={styles.bloodTypeValue}>{record.personalInfo.bloodType || copy.unknown}</Text>
          </View>

          {criticalAllergies.length > 0 ? (
            <View style={styles.cardSection}>
              <View style={styles.cardSectionHeader}>
                <AlertTriangle color="#FEF2F2" size={14} />
                <Text style={styles.cardSectionTitleCritical}>{copy.criticalAllergies}</Text>
              </View>
              {criticalAllergies.map((allergy) => (
                <Text key={allergy.id} style={styles.cardCriticalItem}>
                  {'⚠ ' + allergy.name + ' (' + translateSeverity(allergy.severity) + ')' + (allergy.reaction ? ' — ' + allergy.reaction : '')}
                </Text>
              ))}
            </View>
          ) : null}

          {record.allergies.length > criticalAllergies.length ? (
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>{copy.otherAllergies}</Text>
              {record.allergies
                .filter((allergy) => allergy.severity !== 'life-threatening' && allergy.severity !== 'severe')
                .map((allergy) => (
                  <Text key={allergy.id} style={styles.cardItem}>
                    {'• ' + allergy.name + ' (' + translateSeverity(allergy.severity) + ')'}
                  </Text>
                ))}
            </View>
          ) : null}

          {activeMeds.length > 0 ? (
            <View style={styles.cardSection}>
              <View style={styles.cardSectionHeader}>
                <Pill color={Colors.primary} size={14} />
                <Text style={styles.cardSectionTitle}>{copy.currentMedications}</Text>
              </View>
              {activeMeds.map((medication) => (
                <Text key={medication.id} style={styles.cardItem}>
                  {'• ' + medication.name + ' ' + medication.dosage + ' — ' + medication.frequency}
                </Text>
              ))}
            </View>
          ) : null}

          {record.conditions.length > 0 ? (
            <View style={styles.cardSection}>
              <View style={styles.cardSectionHeader}>
                <Activity color={Colors.primary} size={14} />
                <Text style={styles.cardSectionTitle}>{copy.conditions}</Text>
              </View>
              {record.conditions.map((condition) => (
                <Text key={condition.id} style={styles.cardItem}>{'• ' + condition.name}</Text>
              ))}
            </View>
          ) : null}

          {primaryContact ? (
            <View style={styles.cardSection}>
              <View style={styles.cardSectionHeader}>
                <Phone color={Colors.primary} size={14} />
                <Text style={styles.cardSectionTitle}>{copy.emergencyContact}</Text>
              </View>
              <Text style={styles.cardItem}>{primaryContact.name + ' (' + primaryContact.relationship + ')'}</Text>
              <Text style={styles.cardContactPhone}>{primaryContact.phone}</Text>
            </View>
          ) : null}

          {record.insurance.provider ? (
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>{copy.insurance}</Text>
              <Text style={styles.cardItem}>{record.insurance.provider}</Text>
              {record.insurance.memberId ? (
                <Text style={styles.cardItem}>{interpolate(copy.insuranceId, { value: record.insurance.memberId })}</Text>
              ) : null}
            </View>
          ) : null}

          {record.personalInfo.religiousPreference ? (
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>{copy.religiousPreference}</Text>
              <Text style={styles.cardItem}>{record.personalInfo.religiousPreference}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>{copy.disclaimer}</Text>
          <Text style={styles.cardFooterBrand}>MyBodyIsMyHealth.com</Text>
        </View>
      </View>

      <View style={styles.tipCard}>
        <Info color={Colors.primary} size={16} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>{copy.tipsTitle}</Text>
          <Text style={styles.tipText}>{copy.tipScreenshot}</Text>
          <Text style={styles.tipText}>{copy.tipPrint}</Text>
          <Text style={styles.tipText}>{copy.tipSticker}</Text>
          <Text style={styles.tipText}>{copy.tipShare}</Text>
          <Text style={styles.tipText}>{copy.tipUpdate}</Text>
        </View>
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
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primaryDark,
    lineHeight: 19,
  },
  walletCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
  cardHeaderBrand: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  patientRow: {
    gap: 2,
  },
  patientName: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  patientDob: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  bloodTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.emergency,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  bloodTypeLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  bloodTypeValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
  cardSection: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  cardSectionTitleCritical: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.emergency,
    letterSpacing: 0.5,
  },
  cardCriticalItem: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.emergency,
    lineHeight: 20,
  },
  cardItem: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  cardContactPhone: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  cardFooter: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 2,
  },
  cardFooterText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
  },
  cardFooterBrand: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  tipContent: {
    flex: 1,
    gap: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
