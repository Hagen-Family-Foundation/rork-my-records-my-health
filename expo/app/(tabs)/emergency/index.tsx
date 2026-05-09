import React, { useEffect, useCallback, useState, useRef } from 'react';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ScaledText';
import { Image } from 'expo-image';
import {
  Pill,
  AlertTriangle,
  Phone,
  Droplets,
  Activity,
  FileText,
  Siren,
  Camera,
  X,
  BookOpen,
  Shield,
  Printer,
} from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { useSecurity } from '@/providers/SecurityProvider';
import Colors from '@/constants/colors';
import { interpolate, usePhraseSet } from '@/localization/runtime';
import { formatRelativeTime, isStale, formatFullName, formatPhoneDisplay } from '@/utils/format';
import { MedicalDocument } from '@/types/health';
import { triggerHaptic } from '@/utils/haptics';
import {
  buildEmergencyCardFileName,
  formatEmergencyCardPrintedDate,
  prepareEmergencyCardHtml,
  printEmergencyCardHtml,
} from '@/utils/emergencyCard';

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const { record, logEmergencyAccess, logAction } = useHealthRecords();
  const { settings } = useSecurity();
  const [viewingDocument, setViewingDocument] = useState<MedicalDocument | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasPreparedEmergencyText = useRef<boolean>(false);
  const copy = usePhraseSet({
    cannotCallTitle: 'Cannot make call',
    cannotCallMessage: 'Call {phone}',
    emergencyView: 'EMERGENCY VIEW',
    noNameSet: 'NO NAME SET',
    dob: 'DOB',
    unknown: 'UNKNOWN',
    criticalAllergies: 'CRITICAL ALLERGIES',
    otherAllergies: 'OTHER ALLERGIES',
    medications: 'MEDICATIONS',
    stale: 'STALE',
    lastVerified: 'Last verified: {time}',
    currentConditions: 'CURRENT CONDITIONS',
    emergencyContacts: 'EMERGENCY CONTACTS',
    callAccessibilityLabel: 'Call {name}, {relationship}',
    callAccessibilityHint: 'Double tap to call {phone}',
    criticalDocuments: 'CRITICAL DOCUMENTS',
    notes: 'NOTES',
    insuranceInformation: 'INSURANCE INFORMATION',
    insuranceId: 'ID: {value}',
    insurancePolicy: 'Policy: {value}',
    disclaimer: 'User-managed information. Verify with patient when possible.',
    printInstructionsTitle: 'Print Emergency Card',
    printInstructionsBody:
      'Tap Print Emergency Card to create a wallet-sized emergency card. You can also open the Share tab and use the Wallet Emergency Card option to save/download, email, or print the same PDF. On iPhone, the share sheet can send it to Print, Save to Files, a connected flash drive when available, AirDrop, email, or a printer app. It is laid out as front and back panels on one sheet, with the printed date added automatically from this device.',
    printedDate: 'Printed date: {date}',
    printCard: 'Print Emergency Card',
    preparingPrint: 'PREPARING CARD...',
    printAccessibilityLabel: 'Print or save emergency information card',
    printErrorTitle: 'Unable to prepare card',
    printErrorMessage: 'The emergency information card could not be prepared. Please try again.',
    printUnavailableMessage: 'Printing is not available from this browser window. Please try from the mobile app or enable pop-ups for this page.',
    printShareUnavailableMessage: 'PDF sharing is not available on this device. Please try from another phone or use the browser print option.',
    printShareDialogTitle: 'Print or save Emergency Card',
    emergencySmsBody: '{patient} may need help. Emergency View activated.',
    emergencySmsLocationLine: 'Approximate location: {latitude}, {longitude}',
    emergencySmsMapLine: 'Map: {url}',
    severityMild: 'Mild',
    severityModerate: 'Moderate',
    severitySevere: 'Severe',
    severityLifeThreatening: 'Life-threatening',
  });

  useEffect(() => {
    logEmergencyAccess();
    void triggerHaptic('emergencyAccess');
    console.log('[EmergencyScreen] Emergency View opened, access logged');
  }, [logEmergencyAccess]);

  useEffect(() => {
    const primaryContact = record.emergencyContacts.find((contact) => contact.isPrimary && contact.phone.trim().length > 0);

    if (!settings.emergencyTextPrimaryContactEnabled || !primaryContact || hasPreparedEmergencyText.current) {
      return;
    }

    hasPreparedEmergencyText.current = true;

    const patientName = formatFullName(record.personalInfo.firstName, record.personalInfo.lastName) || copy.noNameSet;
    const baseMessage = interpolate(copy.emergencySmsBody, { patient: patientName });

    const buildEmergencySmsMessage = async (): Promise<{ message: string; includesLocation: boolean }> => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        console.log('[EmergencyScreen] Location permission status for emergency text:', permission.status);

        if (permission.status !== 'granted') {
          return { message: baseMessage, includesLocation: false };
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const latitudeText = position.coords.latitude.toFixed(5);
        const longitudeText = position.coords.longitude.toFixed(5);
        const mapUrl = 'https://maps.google.com/?q=' + latitudeText + ',' + longitudeText;
        console.log('[EmergencyScreen] Emergency text location captured:', latitudeText, longitudeText);

        return {
          message: [
            baseMessage,
            interpolate(copy.emergencySmsLocationLine, { latitude: latitudeText, longitude: longitudeText }),
            interpolate(copy.emergencySmsMapLine, { url: mapUrl }),
          ].join('\n'),
          includesLocation: true,
        };
      } catch (error) {
        console.error('[EmergencyScreen] Failed to capture location for emergency text:', error);
        return { message: baseMessage, includesLocation: false };
      }
    };

    const prepareEmergencySms = async () => {
      try {
        const available = await SMS.isAvailableAsync();
        if (!available) {
          console.log('[EmergencyScreen] SMS is not available on this device, skipping automatic emergency text');
          return;
        }

        const smsPayload = await buildEmergencySmsMessage();
        const result = await SMS.sendSMSAsync(primaryContact.phone, smsPayload.message);
        logAction(
          'emergency_text_prepared',
          smsPayload.includesLocation
            ? 'Prepared emergency SMS with location for primary contact'
            : 'Prepared emergency SMS for primary contact',
          'Emergency'
        );
        console.log('[EmergencyScreen] Emergency SMS composer opened with result:', result.result);
      } catch (error) {
        console.error('[EmergencyScreen] Failed to prepare emergency SMS:', error);
      }
    };

    void prepareEmergencySms();
  }, [
    copy.emergencySmsBody,
    copy.emergencySmsLocationLine,
    copy.emergencySmsMapLine,
    copy.noNameSet,
    logAction,
    record.emergencyContacts,
    record.personalInfo.firstName,
    record.personalInfo.lastName,
    settings.emergencyTextPrimaryContactEnabled,
  ]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleCallContact = useCallback(
    (phone: string) => {
      const url = 'tel:' + phone;
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            void Linking.openURL(url);
          } else {
            Alert.alert(copy.cannotCallTitle, interpolate(copy.cannotCallMessage, { phone }));
          }
        })
        .catch(() => {
          Alert.alert(copy.cannotCallTitle, interpolate(copy.cannotCallMessage, { phone }));
        });
    },
    [copy.cannotCallMessage, copy.cannotCallTitle]
  );

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

  const fullName = formatFullName(record.personalInfo.firstName, record.personalInfo.lastName);
  const hasName = Boolean(record.personalInfo.firstName || record.personalInfo.lastName);
  const medVerificationStale = isStale(record.medicationVerification.lastVerifiedAt, 30);
  const lifeThreateningAllergies = record.allergies.filter((allergy) => allergy.severity === 'life-threatening');
  const severeAllergies = record.allergies.filter((allergy) => allergy.severity === 'severe');
  const criticalAllergies = [...lifeThreateningAllergies, ...severeAllergies];
  const currentConditions = record.conditions;
  const activeMedications = record.medications.filter((medication) => medication.status !== 'discontinued');
  const printedDateLabel = formatEmergencyCardPrintedDate(new Date());

  const handlePrintEmergencyCard = useCallback(async () => {
    if (isPrinting) return;

    setIsPrinting(true);
    void triggerHaptic('select');

    try {
      const preparedCard = await prepareEmergencyCardHtml({
        record,
        copy,
        translateSeverity,
      });
      const outputMethod = await printEmergencyCardHtml({
        html: preparedCard.html,
        dialogTitle: copy.printShareDialogTitle,
        fileName: buildEmergencyCardFileName(record, preparedCard.printedDate),
      });

      logAction(
        'record_exported',
        outputMethod === 'pdf_share' ? 'Prepared emergency information card PDF' : 'Printed emergency information card',
        'Emergency',
        { printedDate: preparedCard.printedDate, outputMethod }
      );
      console.log('[EmergencyScreen] Emergency View print requested for date:', preparedCard.printedDate, 'method:', outputMethod);
    } catch (error) {
      console.error('[EmergencyScreen] Failed to print emergency card:', error);
      if (error instanceof Error && error.message === 'WEB_PRINT_WINDOW_BLOCKED') {
        Alert.alert(copy.printErrorTitle, copy.printUnavailableMessage);
      } else if (error instanceof Error && error.message === 'PDF_SHARING_UNAVAILABLE') {
        Alert.alert(copy.printErrorTitle, copy.printShareUnavailableMessage);
      } else {
        Alert.alert(copy.printErrorTitle, copy.printErrorMessage);
      }
    } finally {
      setIsPrinting(false);
    }
  }, [copy, isPrinting, logAction, record, translateSeverity]);

  return (
    <View style={[styles.emergencyContainer, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.emergencyContent, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.emergencyHeader}>
          <Siren color={Colors.white} size={32} />
          <Text style={styles.emergencyTitle} accessibilityRole="header">{copy.emergencyView}</Text>
        </View>
        <ScrollView style={styles.emergencyScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyPatientName} accessibilityRole="header">
              {hasName ? fullName : copy.noNameSet}
            </Text>
            {record.personalInfo.dateOfBirth ? (
              <Text style={styles.emergencySubtext}>{copy.dob + ': ' + record.personalInfo.dateOfBirth}</Text>
            ) : null}
            <View style={styles.bloodTypeChip}>
              <Droplets color={Colors.white} size={18} />
              <Text style={styles.bloodTypeText}>{record.personalInfo.bloodType || copy.unknown}</Text>
            </View>
            {record.personalInfo.religiousPreference ? (
              <View style={styles.religionRow}>
                <BookOpen color="rgba(255,255,255,0.7)" size={14} />
                <Text style={styles.religionText}>{String(record.personalInfo.religiousPreference)}</Text>
              </View>
            ) : null}
          </View>

          {criticalAllergies.length > 0 ? (
            <View style={styles.emergencySectionCritical}>
              <View style={styles.emergencySectionHeader}>
                <AlertTriangle color="#FEF2F2" size={20} />
                <Text style={styles.emergencySectionTitle}>{copy.criticalAllergies}</Text>
              </View>
              {criticalAllergies.map((allergy) => (
                <View key={allergy.id} style={styles.emergencyAllergyItem}>
                  <Text style={styles.emergencyAllergyName}>{String(allergy.name)}</Text>
                  <Text style={styles.emergencyAllergySeverity}>
                    {translateSeverity(allergy.severity) + (allergy.reaction ? ' — ' + allergy.reaction : '')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {record.allergies.length > criticalAllergies.length ? (
            <View style={styles.emergencySection}>
              <View style={styles.emergencySectionHeader}>
                <AlertTriangle color="#FBBF24" size={20} />
                <Text style={styles.emergencySectionTitleDark}>{copy.otherAllergies}</Text>
              </View>
              {record.allergies
                .filter((allergy) => allergy.severity !== 'life-threatening' && allergy.severity !== 'severe')
                .map((allergy) => (
                  <Text key={allergy.id} style={styles.emergencyListItem}>
                    {String('• ' + allergy.name + ' (' + translateSeverity(allergy.severity) + ')')}
                  </Text>
                ))}
            </View>
          ) : null}

          {activeMedications.length > 0 ? (
            <View style={styles.emergencySection}>
              <View style={styles.emergencySectionHeader}>
                <Pill color={Colors.primary} size={20} />
                <Text style={styles.emergencySectionTitleDark}>{copy.medications}</Text>
                {medVerificationStale ? (
                  <View style={styles.staleChip}>
                    <Text style={styles.staleChipText}>{copy.stale}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.emergencyVerified}>
                {interpolate(copy.lastVerified, {
                  time: formatRelativeTime(record.medicationVerification.lastVerifiedAt),
                })}
              </Text>
              {activeMedications.map((medication) => (
                <Text key={medication.id} style={styles.emergencyListItem}>
                  {String('• ' + medication.name + ' ' + medication.dosage + ' — ' + medication.frequency)}
                </Text>
              ))}
            </View>
          ) : null}

          {currentConditions.length > 0 ? (
            <View style={styles.emergencySection}>
              <View style={styles.emergencySectionHeader}>
                <Activity color={Colors.primary} size={20} />
                <Text style={styles.emergencySectionTitleDark}>{copy.currentConditions}</Text>
              </View>
              {currentConditions.map((condition) => (
                <Text key={condition.id} style={styles.emergencyListItem}>{String('• ' + condition.name)}</Text>
              ))}
            </View>
          ) : null}

          {record.emergencyContacts.length > 0 ? (
            <View style={styles.emergencySection}>
              <View style={styles.emergencySectionHeader}>
                <Phone color={Colors.primary} size={20} />
                <Text style={styles.emergencySectionTitleDark}>{copy.emergencyContacts}</Text>
              </View>
              {record.emergencyContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.emergencyContactBtn}
                  onPress={() => handleCallContact(contact.phone)}
                  testID={String('emergency-call-' + contact.id)}
                  accessibilityLabel={interpolate(copy.callAccessibilityLabel, {
                    name: contact.name,
                    relationship: contact.relationship,
                  })}
                  accessibilityHint={interpolate(copy.callAccessibilityHint, {
                    phone: contact.phone,
                  })}
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={styles.emergencyContactName}>{String(contact.name + ' (' + contact.relationship + ')' + (contact.isPrimary ? ' ★' : ''))}</Text>
                    <Text style={styles.emergencyContactPhone}>{formatPhoneDisplay(contact.phone)}</Text>
                  </View>
                  <Phone color={Colors.emergency} size={20} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {record.documents.length > 0 ? (
            <View style={styles.emergencySection}>
              <View style={styles.emergencySectionHeader}>
                <Camera color={Colors.primary} size={20} />
                <Text style={styles.emergencySectionTitleDark}>{copy.criticalDocuments}</Text>
              </View>
              <View style={styles.docGrid}>
                {record.documents.map((document) => (
                  <TouchableOpacity
                    key={document.id}
                    style={styles.docThumb}
                    onPress={() => setViewingDocument(document)}
                    testID={String('view-doc-' + document.id)}
                  >
                    <Image source={{ uri: document.fileUri }} style={styles.docThumbImage} contentFit="cover" />
                    <Text style={styles.docThumbLabel} numberOfLines={1}>
                      {String(document.label || document.type.replace(/_/g, ' '))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {record.emergencyNotes.content ? (
            <View style={styles.emergencySection}>
              <View style={styles.emergencySectionHeader}>
                <FileText color={Colors.primary} size={20} />
                <Text style={styles.emergencySectionTitleDark}>{copy.notes}</Text>
              </View>
              <Text style={styles.emergencyNotesText}>{String(record.emergencyNotes.content)}</Text>
            </View>
          ) : null}

          {record.insurance.provider ? (
            <View style={styles.emergencySection}>
              <View style={styles.emergencySectionHeader}>
                <Shield color={Colors.primary} size={20} />
                <Text style={styles.emergencySectionTitleDark}>{copy.insuranceInformation}</Text>
              </View>
              <Text style={styles.emergencyListItem}>{String(record.insurance.provider)}</Text>
              <Text style={styles.emergencyListItem}>{interpolate(copy.insuranceId, { value: record.insurance.memberId })}</Text>
              <Text style={styles.emergencyListItem}>{interpolate(copy.insurancePolicy, { value: record.insurance.policyNumber })}</Text>
            </View>
          ) : null}

          <View style={styles.emergencyDisclaimerContainer}>
            <Text style={styles.emergencyDisclaimer}>{copy.disclaimer}</Text>
          </View>

          <View style={styles.printInstructionsCard}>
            <Printer color={Colors.primary} size={20} />
            <View style={styles.printInstructionsContent}>
              <Text style={styles.printInstructionsTitle}>{copy.printInstructionsTitle}</Text>
              <Text style={styles.printInstructionsBody}>{copy.printInstructionsBody}</Text>
              <Text style={styles.printedDateText}>{interpolate(copy.printedDate, { date: printedDateLabel })}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.printCardBtn, isPrinting ? styles.printCardBtnDisabled : undefined]}
            onPress={handlePrintEmergencyCard}
            disabled={isPrinting}
            testID="print-emergency-card"
            accessibilityLabel={copy.printAccessibilityLabel}
            accessibilityRole="button"
          >
            <Printer color={Colors.white} size={18} />
            <Text style={styles.printCardText}>{isPrinting ? copy.preparingPrint : copy.printCard}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
      <Modal
        visible={viewingDocument !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingDocument(null)}
      >
        <View style={styles.docModalOverlay}>
          <View style={[styles.docModalHeader, { paddingTop: insets.top + 10 }] }>
            <Text style={styles.docModalTitle}>{viewingDocument ? String(viewingDocument.label || viewingDocument.type.replace(/_/g, ' ')) : ''}</Text>
            <TouchableOpacity style={styles.docModalClose} onPress={() => setViewingDocument(null)} testID="close-doc-viewer">
              <X color={Colors.white} size={24} />
            </TouchableOpacity>
          </View>
          {viewingDocument ? (
            <View style={styles.docModalContent}>
              <Image source={{ uri: viewingDocument.fileUri }} style={styles.docModalImage} contentFit="contain" />
              {viewingDocument.notes ? (
                <View style={styles.docModalNotes}>
                  <Text style={styles.docModalNotesText}>{String(viewingDocument.notes)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  emergencyContainer: {
    flex: 1,
    backgroundColor: '#0B1929',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: Colors.emergency,
  },
  emergencyTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: Colors.white,
    letterSpacing: 2,
  },
  emergencyScroll: {
    flex: 1,
    padding: 16,
  },
  emergencyCard: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  emergencyPatientName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.white,
    textAlign: 'center',
  },
  emergencySubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  bloodTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.emergency,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
  },
  bloodTypeText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
  religionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  religionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
  },
  emergencySectionCritical: {
    backgroundColor: '#991B1B',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  emergencySection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  emergencySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencySectionTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#FEF2F2',
    letterSpacing: 1,
  },
  emergencySectionTitleDark: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  emergencyAllergyItem: {
    paddingLeft: 4,
  },
  emergencyAllergyName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  emergencyAllergySeverity: {
    fontSize: 13,
    color: '#FECACA',
  },
  emergencyListItem: {
    fontSize: 15,
    color: Colors.text,
    paddingLeft: 4,
    lineHeight: 22,
  },
  emergencyVerified: {
    fontSize: 11,
    color: Colors.textTertiary,
    paddingLeft: 4,
  },
  staleChip: {
    backgroundColor: Colors.warningLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  staleChipText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  emergencyContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.emergencyLight,
    borderRadius: 10,
    padding: 12,
  },
  emergencyContactName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emergencyContactPhone: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  emergencyNotesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingLeft: 4,
  },
  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  docThumb: {
    width: 100,
    gap: 4,
  },
  docThumbImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  docThumbLabel: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  emergencyDisclaimerContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emergencyDisclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
  printInstructionsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  printInstructionsContent: {
    flex: 1,
    gap: 4,
  },
  printInstructionsTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  printInstructionsBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  printedDateText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginTop: 2,
  },
  printCardBtn: {
    backgroundColor: Colors.emergency,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  printCardBtnDisabled: {
    opacity: 0.65,
  },
  printCardText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  docModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  docModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  docModalTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
    flex: 1,
    textTransform: 'capitalize' as const,
  },
  docModalClose: {
    padding: 8,
  },
  docModalContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  docModalImage: {
    flex: 1,
    borderRadius: 8,
  },
  docModalNotes: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  docModalNotesText: {
    fontSize: 14,
    color: Colors.white,
    lineHeight: 20,
  },
});
