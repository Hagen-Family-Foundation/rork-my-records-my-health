import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text, TextInput } from '@/components/ScaledText';
import * as Linking from 'expo-linking';
import {
  AlertTriangle,
  Braces,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Lock,
  Mail,
  Printer,
  Share2,
  ShieldCheck,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { isFeatureEnabled } from '@/constants/appConfig';
import { interpolate, usePhraseSet } from '@/localization/runtime';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { triggerHaptic } from '@/utils/haptics';
import { openPrivacyPolicy } from '@/utils/privacy';
import {
  ExportSectionKey,
  ExportSelection,
  filterRecordForExport,
  generateEmergencyExport,
  generateMinimalEmergencyExport,
  getDefaultExportSelection,
  getEnabledExportSections,
  getNameOnlyExportSelection,
} from '@/utils/export';
import { healthRecordToFHIRBundle } from '@/utils/fhir';
import {
  buildEmergencyCardFileName,
  createEmergencyCardPdfFile,
  formatEmergencyCardPrintedDate,
  prepareEmergencyCardHtml,
  printEmergencyCardHtml,
  shareEmergencyCardPdfFile,
} from '@/utils/emergencyCard';

type ExportType = 'full' | 'minimal' | 'fhir';
type EmergencyCardAction = 'save' | 'email' | 'print';

interface SectionOption {
  key: ExportSectionKey;
  label: string;
  description: string;
}

type SharePresetKey = 'fullHistory' | 'specialist' | 'emergency' | 'admin' | 'custom';

interface SharePresetOption {
  key: Exclude<SharePresetKey, 'custom'>;
  label: string;
  description: string;
  exportType: ExportType;
  selection: ExportSelection;
}

const MINIMAL_EXPORT_SECTION_KEYS: ExportSectionKey[] = [
  'personalDetails',
  'emergencyContacts',
  'allergies',
  'activeMedications',
  'conditions',
  'documents',
];

function getScopedSelection(selection: ExportSelection, exportType: ExportType): ExportSelection {
  if (exportType !== 'minimal') {
    return selection;
  }

  const scopedSelection = getNameOnlyExportSelection();
  MINIMAL_EXPORT_SECTION_KEYS.forEach((key) => {
    scopedSelection[key] = selection[key];
  });
  return scopedSelection;
}

function getVisibleSectionKeys(exportType: ExportType): ExportSectionKey[] {
  return exportType === 'minimal'
    ? MINIMAL_EXPORT_SECTION_KEYS
    : [
        'personalDetails',
        'emergencyContacts',
        'allergies',
        'activeMedications',
        'discontinuedMedications',
        'conditions',
        'procedures',
        'insurance',
        'emergencyNotes',
        'documents',
      ];
}

function createPresetSelection(overrides: Partial<ExportSelection>): ExportSelection {
  return {
    ...getNameOnlyExportSelection(),
    ...overrides,
  };
}

function matchesSharePreset(
  currentSelection: ExportSelection,
  currentExportType: ExportType,
  preset: SharePresetOption
): boolean {
  if (currentExportType !== preset.exportType) {
    return false;
  }

  const currentScopedSelection = getScopedSelection(currentSelection, currentExportType);
  const presetScopedSelection = getScopedSelection(preset.selection, preset.exportType);
  const keysToCompare = getVisibleSectionKeys(preset.exportType);

  return keysToCompare.every((key) => currentScopedSelection[key] === presetScopedSelection[key]);
}

export default function ShareScreen() {
  const { record, logExport, logShare } = useHealthRecords();
  const [email, setEmail] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [exportType, setExportType] = useState<ExportType>('full');
  const [copied, setCopied] = useState<boolean>(false);
  const [selection, setSelection] = useState<ExportSelection>(getDefaultExportSelection());
  const [emergencyCardAction, setEmergencyCardAction] = useState<EmergencyCardAction | null>(null);

  const activeMedicationsCount = useMemo(
    () => record.medications.filter((medication) => medication.status !== 'discontinued').length,
    [record.medications]
  );
  const discontinuedMedicationsCount = useMemo(
    () => record.medications.filter((medication) => medication.status === 'discontinued').length,
    [record.medications]
  );

  const fhirEnabled = isFeatureEnabled('fhirExport');
  const copy = usePhraseSet({
    alertErrorTitle: 'Error',
    alertCopyFailed: 'Failed to copy to clipboard',
    alertEmailRequiredTitle: 'Email Required',
    alertEmailRequiredMessage: 'Please enter a recipient email address.',
    alertEmailOpenFailed: 'Could not open email client',
    alertEmailUnsupported: 'No email app is available to handle this request.',
    emailSubject: 'Emergency Medical Record — MyRecordsMyHealth',
    copySuccess: 'Copied!',
    copyFullRecord: 'Copy Full Record',
    copyEmergencyRecord: 'Copy Emergency Record',
    copyFhirRecord: 'Copy FHIR Bundle',
    privacyTitle: 'Your Data, Your Control',
    privacyText:
      'Sharing generates a user-approved export. No data is synced silently. You control exactly what is shared, with whom, and when. Exports keep the details you entered, so your records can stay in the language you choose.',
    exportTypeTitle: 'EXPORT TYPE',
    exportFullLabel: 'Full Record',
    exportFullAccessibility: 'Full record export',
    exportMinimalLabel: 'Emergency Only',
    exportMinimalAccessibility: 'Emergency only export',
    exportFhirLabel: 'FHIR Bundle (JSON)',
    exportFhirHintEnabled: 'Healthcare-standard format for provider systems',
    exportFhirHintPreview: 'Healthcare-standard format — preview available',
    exportHintFhir:
      'FHIR R4 Bundle containing Patient, AllergyIntolerance, MedicationStatement, Condition, Procedure, and Coverage resources.',
    exportHintFull:
      'Includes all records: personal info, medications, conditions, procedures, insurance, documents, and contacts.',
    exportHintMinimal:
      'Minimal emergency snapshot: name, blood type, allergies, active medications, conditions, and primary contact.',
    exportHintShared: 'Your entered names, notes, and medical details are preserved as written.',
    shareTemplateTitle: 'START WITH A SHARING TEMPLATE',
    shareTemplateDescription:
      'Pick the reason for sharing first. The app will recommend the right mix, then you can fine-tune every section below.',
    shareTemplateFullHistory: 'Complete record',
    shareTemplateFullHistoryHint: 'Everything stays on for a new doctor, intake form, or full review.',
    shareTemplateSpecialist: 'Specialist visit',
    shareTemplateSpecialistHint:
      'Focus on allergies, current meds, conditions, procedures, and documents without sending every extra detail.',
    shareTemplateEmergency: 'Emergency summary',
    shareTemplateEmergencyHint: 'Switches to the high-priority emergency snapshot for urgent care situations.',
    shareTemplateAdmin: 'Paperwork only',
    shareTemplateAdminHint: 'Identity, insurance, procedures, and documents for claims, forms, or admin requests.',
    shareTemplateEmergencyCard: 'Wallet Emergency Card',
    shareTemplateEmergencyCardHint:
      'Create the wallet-sized Emergency Card PDF here, then save/download it, email it, or print it.',
    shareTemplateActive: 'Active',
    shareTemplateCustomActive: 'Manual selection active — you adjusted the recommended mix.',
    shareTemplateFhirActive: 'FHIR bundle active — templates below are for human-readable shares.',
    shareTemplateFineTune: 'Templates are only a starting point. Deselect anything the doctor did not ask for before sending.',
    emergencyCardActionsTitle: 'EMERGENCY CARD FILE',
    emergencyCardActionsDescription:
      'This creates the same wallet-sized card used in Emergency View. The generated date comes directly from this phone.',
    emergencyCardDate: 'Generated date: {date}',
    emergencyCardSaveDownload: 'Save / Download',
    emergencyCardEmail: 'Email Card',
    emergencyCardPrint: 'Print Card',
    emergencyCardPreparing: 'Preparing...',
    emergencyCardShareNote:
      'Use the phone share sheet to choose Save to Files, a connected flash drive when available, Mail/Gmail, AirDrop, a printer app, or another file destination.',
    emergencyCardSaveDialogTitle: 'Save or download Emergency Card',
    emergencyCardEmailDialogTitle: 'Email Emergency Card',
    emergencyCardPrintDialogTitle: 'Print or save Emergency Card',
    emergencyCardErrorTitle: 'Unable to prepare card',
    emergencyCardErrorMessage: 'The emergency card file could not be prepared. Please try again.',
    emergencyCardShareUnavailableMessage:
      'File sharing is not available on this device. Try from the mobile app or use the print option to save as PDF.',
    emergencyCardWebFallbackMessage:
      'A print window opened. Choose Save as PDF to download the wallet card, then attach that PDF to email or copy it to storage if needed.',
    shareSelectionTitle: 'CHOOSE WHAT TO SHARE',
    shareSelectionDescription:
      'Your name stays included. Everything else starts on, so you can deselect any section a la carte before sending.',
    shareSelectionMinimalDescription:
      'Emergency Only exports show only the sections used in the emergency summary. Hidden sections are excluded automatically.',
    shareSelectionNameRequired: 'Patient name is always included',
    shareSelectionSelectedCount: '{count} optional section(s) selected',
    shareSelectionNameOnlySummary: 'Name only',
    shareSelectionQuickSelectAll: 'Select All',
    shareSelectionQuickNameOnly: 'Name Only',
    shareSelectionSpecialistHint:
      'Best for specialists: leave everything on, then uncheck anything unrelated before sending.',
    shareSelectionPersonalDetails: 'Personal details',
    shareReviewTitle: 'REVIEW BEFORE SENDING',
    shareReviewDescription: 'Only the checked items below will go into the email draft.',
    shareReviewAlwaysName: 'Name',
    shareReviewIncludedTitle: 'Sending',
    shareReviewExcludedTitle: 'Not sending',
    shareReviewNothingExcluded: 'Nothing excluded',
    shareReviewExcludedNote: 'Unchecked sections stay out of the email draft and confirmation.',
    shareSelectionPersonalDetailsHint: 'DOB, phone, blood type, address, and preferences',
    shareSelectionEmergencyContacts: 'Emergency contacts',
    shareSelectionAllergies: 'Allergies',
    shareSelectionActiveMedications: 'Current medications',
    shareSelectionDiscontinuedMedications: 'Discontinued medications',
    shareSelectionConditions: 'Conditions',
    shareSelectionProcedures: 'Procedure history',
    shareSelectionInsurance: 'Insurance',
    shareSelectionEmergencyNotes: 'Emergency notes',
    shareSelectionDocuments: 'Documents on file',
    shareSelectionContactsCount: '{count} contact(s)',
    shareSelectionAllergiesCount: '{count} allerg{suffix}',
    shareSelectionCurrentMedsCount: '{count} active medication(s)',
    shareSelectionPastMedsCount: '{count} past medication(s)',
    shareSelectionConditionsCount: '{count} condition(s)',
    shareSelectionProceduresCount: '{count} procedure(s)',
    shareSelectionInsurancePresent: 'Policy, member ID, and insurer contact details',
    shareSelectionInsuranceMissing: 'No insurance details saved',
    shareSelectionNotesPresent: 'Saved note will be included',
    shareSelectionNotesMissing: 'No emergency note saved',
    shareSelectionDocumentsCount: '{count} document(s) listed',
    shareEmailTitle: 'SHARE VIA EMAIL',
    emailPlaceholder: 'doctor@example.com',
    sendToDoctor: 'Send to Doctor',
    consentText: 'Opens your email app with your approved record. Nothing is sent without your action.',
    confirmShareTitle: 'Confirm Email Draft',
    confirmShareMessage: 'Open an email draft for {recipient} with this exact selection?\n\n{items}',
    confirmShareSending: 'Sending',
    confirmShareNotSending: 'Not sending',
    confirmShareNothingExcluded: 'Nothing excluded',
    confirmShareCancel: 'Cancel',
    confirmShareSend: 'Open Email',
    copyClipboardTitle: 'COPY TO CLIPBOARD',
    previewExport: 'Preview Export',
    clinicalDisclaimerTitle: 'Clinical Disclaimer',
    clinicalDisclaimerText:
      'This information is user-provided and user-managed. It is not a substitute for professional medical records. Medical professionals should verify all information with the patient or their healthcare provider when possible.',
    privacyCommitmentTitle: 'Privacy Commitment',
    privacyCommitmentText:
      'MyRecordsMyHealth does not sell, share, or broker your health data. No advertising. No hidden monetization. Your records exist only on your device unless you choose to export them.',
    viewFullPrivacyPolicy: 'View full privacy policy',
    exportGenerated: 'Generated',
    exportPatientInformation: 'PATIENT INFORMATION',
    exportName: 'Name',
    exportDob: 'DOB',
    exportBloodType: 'Blood Type',
    exportUnknown: 'Unknown',
    exportPhone: 'Phone',
    exportNotProvided: 'Not provided',
    exportReligiousPreference: 'Religious Preference',
    exportEmergencyContacts: 'EMERGENCY CONTACTS',
    exportPrimary: 'PRIMARY',
    exportAllergies: 'ALLERGIES',
    exportCurrentMedications: 'CURRENT MEDICATIONS',
    exportLastVerified: 'Last Verified',
    exportDiscontinuedMedications: 'DISCONTINUED MEDICATIONS',
    exportDiscontinuedOn: 'discontinued',
    exportCurrentConditions: 'CURRENT CONDITIONS',
    exportDiagnosed: 'Diagnosed',
    exportProcedureHistory: 'PROCEDURE HISTORY',
    exportInsurance: 'INSURANCE',
    exportProvider: 'Provider',
    exportPolicy: 'Policy',
    exportMemberId: 'Member ID',
    exportEmergencyNotes: 'EMERGENCY NOTES',
    exportDocumentsOnFile: 'DOCUMENTS ON FILE',
    exportGeneratedByLine: 'MyRecordsMyHealth.com — A MyBodyIsMyHealth.com product',
    exportPatientGeneratedLine: 'This document was generated by the patient.',
    exportVerifyLine:
      'This is user-provided information. Verify with the patient or a licensed medical professional.',
    exportEmergencySummary: '⚕ EMERGENCY SUMMARY',
    exportBlood: 'Blood',
    exportMeds: 'Meds',
    exportConditions: 'Conditions',
    exportEmergencyContact: 'Emergency Contact',
    exportDnrOnFile: 'DNR: On file (see app for document)',
    exportOrganDonorOnFile: 'Organ Donor: On file (see app for document)',
    exportSummaryVerifyLine:
      'This is user-provided information. Verify with the patient or a licensed medical professional.',
    cardNoNameSet: 'NO NAME SET',
    cardDob: 'DOB',
    cardCriticalAllergies: 'CRITICAL ALLERGIES',
    cardOtherAllergies: 'OTHER ALLERGIES',
    cardMedications: 'MEDICATIONS',
    cardCurrentConditions: 'CURRENT CONDITIONS',
    cardEmergencyContacts: 'EMERGENCY CONTACTS',
    cardCriticalDocuments: 'CRITICAL DOCUMENTS',
    cardNotes: 'NOTES',
    cardInsuranceInformation: 'INSURANCE INFORMATION',
    cardPrintedDate: 'Printed date: {date}',
    cardDisclaimer: 'User-managed information. Verify with patient when possible.',
    severityMild: 'Mild',
    severityModerate: 'Moderate',
    severitySevere: 'Severe',
    severityLifeThreatening: 'Life-threatening',
  });

  const visibleSectionKeys = useMemo<ExportSectionKey[]>(() => getVisibleSectionKeys(exportType), [exportType]);
  const scopedSelection = useMemo<ExportSelection>(() => getScopedSelection(selection, exportType), [selection, exportType]);
  const selectedSectionKeys = useMemo<ExportSectionKey[]>(() => getEnabledExportSections(scopedSelection), [scopedSelection]);

  const sectionOptions = useMemo<SectionOption[]>(() => {
    const allergySuffix = record.allergies.length === 1 ? 'y' : 'ies';
    return [
      {
        key: 'personalDetails',
        label: copy.shareSelectionPersonalDetails,
        description: copy.shareSelectionPersonalDetailsHint,
      },
      {
        key: 'emergencyContacts',
        label: copy.shareSelectionEmergencyContacts,
        description: interpolate(copy.shareSelectionContactsCount, {
          count: String(record.emergencyContacts.length),
        }),
      },
      {
        key: 'allergies',
        label: copy.shareSelectionAllergies,
        description: interpolate(copy.shareSelectionAllergiesCount, {
          count: String(record.allergies.length),
          suffix: allergySuffix,
        }),
      },
      {
        key: 'activeMedications',
        label: copy.shareSelectionActiveMedications,
        description: interpolate(copy.shareSelectionCurrentMedsCount, {
          count: String(activeMedicationsCount),
        }),
      },
      {
        key: 'discontinuedMedications',
        label: copy.shareSelectionDiscontinuedMedications,
        description: interpolate(copy.shareSelectionPastMedsCount, {
          count: String(discontinuedMedicationsCount),
        }),
      },
      {
        key: 'conditions',
        label: copy.shareSelectionConditions,
        description: interpolate(copy.shareSelectionConditionsCount, {
          count: String(record.conditions.length),
        }),
      },
      {
        key: 'procedures',
        label: copy.shareSelectionProcedures,
        description: interpolate(copy.shareSelectionProceduresCount, {
          count: String(record.procedures.length),
        }),
      },
      {
        key: 'insurance',
        label: copy.shareSelectionInsurance,
        description:
          record.insurance.provider || record.insurance.memberId || record.insurance.policyNumber
            ? copy.shareSelectionInsurancePresent
            : copy.shareSelectionInsuranceMissing,
      },
      {
        key: 'emergencyNotes',
        label: copy.shareSelectionEmergencyNotes,
        description: record.emergencyNotes.content
          ? copy.shareSelectionNotesPresent
          : copy.shareSelectionNotesMissing,
      },
      {
        key: 'documents',
        label: copy.shareSelectionDocuments,
        description: interpolate(copy.shareSelectionDocumentsCount, {
          count: String(record.documents.length),
        }),
      },
    ].filter((option) => visibleSectionKeys.includes(option.key));
  }, [
    activeMedicationsCount,
    copy.shareSelectionActiveMedications,
    copy.shareSelectionAllergies,
    copy.shareSelectionAllergiesCount,
    copy.shareSelectionConditions,
    copy.shareSelectionConditionsCount,
    copy.shareSelectionContactsCount,
    copy.shareSelectionCurrentMedsCount,
    copy.shareSelectionDiscontinuedMedications,
    copy.shareSelectionDocuments,
    copy.shareSelectionDocumentsCount,
    copy.shareSelectionEmergencyContacts,
    copy.shareSelectionEmergencyNotes,
    copy.shareSelectionInsurance,
    copy.shareSelectionInsuranceMissing,
    copy.shareSelectionInsurancePresent,
    copy.shareSelectionNotesMissing,
    copy.shareSelectionNotesPresent,
    copy.shareSelectionPastMedsCount,
    copy.shareSelectionPersonalDetails,
    copy.shareSelectionPersonalDetailsHint,
    copy.shareSelectionProcedures,
    copy.shareSelectionProceduresCount,
    discontinuedMedicationsCount,
    record.allergies.length,
    record.conditions.length,
    record.documents.length,
    record.emergencyContacts.length,
    record.emergencyNotes.content,
    record.insurance.memberId,
    record.insurance.policyNumber,
    record.insurance.provider,
    record.procedures.length,
    visibleSectionKeys,
  ]);

  const sharePresets = useMemo<SharePresetOption[]>(() => {
    return [
      {
        key: 'fullHistory',
        label: copy.shareTemplateFullHistory,
        description: copy.shareTemplateFullHistoryHint,
        exportType: 'full',
        selection: getDefaultExportSelection(),
      },
      {
        key: 'specialist',
        label: copy.shareTemplateSpecialist,
        description: copy.shareTemplateSpecialistHint,
        exportType: 'full',
        selection: createPresetSelection({
          allergies: true,
          activeMedications: true,
          conditions: true,
          procedures: true,
          documents: true,
        }),
      },
      {
        key: 'emergency',
        label: copy.shareTemplateEmergency,
        description: copy.shareTemplateEmergencyHint,
        exportType: 'minimal',
        selection: getDefaultExportSelection(),
      },
      {
        key: 'admin',
        label: copy.shareTemplateAdmin,
        description: copy.shareTemplateAdminHint,
        exportType: 'full',
        selection: createPresetSelection({
          personalDetails: true,
          procedures: true,
          insurance: true,
          documents: true,
        }),
      },
    ];
  }, [copy]);
  const activeSharePreset = useMemo<SharePresetKey>(() => {
    const matchingPreset = sharePresets.find((preset) => matchesSharePreset(selection, exportType, preset));
    return matchingPreset?.key ?? 'custom';
  }, [exportType, selection, sharePresets]);

  const selectedSectionLabels = useMemo<string[]>(() => {
    return sectionOptions.filter((option) => scopedSelection[option.key]).map((option) => option.label);
  }, [scopedSelection, sectionOptions]);
  const excludedSectionLabels = useMemo<string[]>(() => {
    return sectionOptions.filter((option) => !scopedSelection[option.key]).map((option) => option.label);
  }, [scopedSelection, sectionOptions]);
  const includedSectionLabels = useMemo<string[]>(() => {
    return [copy.shareReviewAlwaysName, ...selectedSectionLabels];
  }, [copy.shareReviewAlwaysName, selectedSectionLabels]);
  const confirmationItems = useMemo<string>(() => {
    const includedItems = includedSectionLabels.map((label) => '• ' + label).join('\n');
    const excludedItems =
      excludedSectionLabels.length > 0
        ? excludedSectionLabels.map((label) => '• ' + label).join('\n')
        : '• ' + copy.confirmShareNothingExcluded;

    return [
      copy.confirmShareSending + ':\n' + includedItems,
      copy.confirmShareNotSending + ':\n' + excludedItems,
    ].join('\n\n');
  }, [
    copy.confirmShareNotSending,
    copy.confirmShareNothingExcluded,
    copy.confirmShareSending,
    excludedSectionLabels,
    includedSectionLabels,
  ]);

  const exportCopy = useMemo(
    () => ({
      generated: copy.exportGenerated,
      patientInformation: copy.exportPatientInformation,
      name: copy.exportName,
      dob: copy.exportDob,
      bloodType: copy.exportBloodType,
      unknown: copy.exportUnknown,
      phone: copy.exportPhone,
      notProvided: copy.exportNotProvided,
      religiousPreference: copy.exportReligiousPreference,
      emergencyContacts: copy.exportEmergencyContacts,
      primary: copy.exportPrimary,
      allergies: copy.exportAllergies,
      currentMedications: copy.exportCurrentMedications,
      lastVerified: copy.exportLastVerified,
      discontinuedMedications: copy.exportDiscontinuedMedications,
      discontinuedOn: copy.exportDiscontinuedOn,
      currentConditions: copy.exportCurrentConditions,
      diagnosed: copy.exportDiagnosed,
      procedureHistory: copy.exportProcedureHistory,
      insurance: copy.exportInsurance,
      provider: copy.exportProvider,
      policy: copy.exportPolicy,
      memberId: copy.exportMemberId,
      emergencyNotes: copy.exportEmergencyNotes,
      documentsOnFile: copy.exportDocumentsOnFile,
      generatedByLine: copy.exportGeneratedByLine,
      patientGeneratedLine: copy.exportPatientGeneratedLine,
      verifyLine: copy.exportVerifyLine,
      emergencySummary: copy.exportEmergencySummary,
      blood: copy.exportBlood,
      meds: copy.exportMeds,
      conditions: copy.exportConditions,
      emergencyContact: copy.exportEmergencyContact,
      dnrOnFile: copy.exportDnrOnFile,
      organDonorOnFile: copy.exportOrganDonorOnFile,
      summaryVerifyLine: copy.exportSummaryVerifyLine,
    }),
    [copy]
  );

  const filteredRecord = useMemo(() => filterRecordForExport(record, scopedSelection), [record, scopedSelection]);
  const selectionSummary = useMemo(() => {
    if (selectedSectionKeys.length === 0) {
      return copy.shareSelectionNameOnlySummary;
    }

    return interpolate(copy.shareSelectionSelectedCount, {
      count: String(selectedSectionKeys.length),
    });
  }, [copy.shareSelectionNameOnlySummary, copy.shareSelectionSelectedCount, selectedSectionKeys.length]);
  const auditSelectionSummary = useMemo(() => {
    return selectedSectionKeys.length === 0
      ? 'name only'
      : String(selectedSectionKeys.length) + ' optional section(s)';
  }, [selectedSectionKeys.length]);

  const exportContent = useMemo(() => {
    if (exportType === 'fhir') {
      const bundle = healthRecordToFHIRBundle(filteredRecord);
      return JSON.stringify(bundle, null, 2);
    }

    return exportType === 'full'
      ? generateEmergencyExport(filteredRecord, exportCopy)
      : generateMinimalEmergencyExport(filteredRecord, exportCopy);
  }, [exportCopy, exportType, filteredRecord]);

  const emergencyCardPrintedDate = useMemo<string>(() => formatEmergencyCardPrintedDate(new Date()), []);
  const emergencyCardPrintCopy = useMemo(
    () => ({
      noNameSet: copy.cardNoNameSet,
      dob: copy.cardDob,
      unknown: copy.exportUnknown,
      criticalAllergies: copy.cardCriticalAllergies,
      otherAllergies: copy.cardOtherAllergies,
      medications: copy.cardMedications,
      lastVerified: copy.exportLastVerified,
      currentConditions: copy.cardCurrentConditions,
      emergencyContacts: copy.cardEmergencyContacts,
      criticalDocuments: copy.cardCriticalDocuments,
      notes: copy.cardNotes,
      insuranceInformation: copy.cardInsuranceInformation,
      insuranceId: copy.exportMemberId,
      insurancePolicy: copy.exportPolicy,
      disclaimer: copy.cardDisclaimer,
      printedDate: copy.cardPrintedDate,
    }),
    [copy]
  );

  const translateSeverity = useCallback(
    (severity: string): string => {
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

  const handleEmergencyCardAction = useCallback(async (action: EmergencyCardAction) => {
    if (emergencyCardAction) return;

    setEmergencyCardAction(action);
    void triggerHaptic('select');

    try {
      const preparedCard = await prepareEmergencyCardHtml({
        record,
        copy: emergencyCardPrintCopy,
        translateSeverity,
      });
      const fileName = buildEmergencyCardFileName(record, preparedCard.printedDate);

      if (action === 'print') {
        const outputMethod = await printEmergencyCardHtml({
          html: preparedCard.html,
          dialogTitle: copy.emergencyCardPrintDialogTitle,
          fileName,
        });
        logExport('emergency card print', 'wallet-sized PDF, generated ' + preparedCard.printedDate + ', method ' + outputMethod);
        void triggerHaptic('success');
        return;
      }

      if (Platform.OS === 'web') {
        await printEmergencyCardHtml({
          html: preparedCard.html,
          dialogTitle: action === 'email' ? copy.emergencyCardEmailDialogTitle : copy.emergencyCardSaveDialogTitle,
          fileName,
        });
        Alert.alert(copy.emergencyCardActionsTitle, copy.emergencyCardWebFallbackMessage);
        logExport('emergency card PDF', 'wallet-sized PDF opened for browser Save as PDF, generated ' + preparedCard.printedDate);
        void triggerHaptic('success');
        return;
      }

      const pdf = await createEmergencyCardPdfFile({ html: preparedCard.html, fileName });
      const shared = await shareEmergencyCardPdfFile(
        pdf.uri,
        action === 'email' ? copy.emergencyCardEmailDialogTitle : copy.emergencyCardSaveDialogTitle
      );

      if (!shared) {
        Alert.alert(copy.emergencyCardErrorTitle, copy.emergencyCardShareUnavailableMessage);
        void triggerHaptic('error');
        return;
      }

      if (action === 'email') {
        logShare('email/share sheet', 'emergency card PDF generated ' + preparedCard.printedDate);
      } else {
        logExport('save/download', 'emergency card PDF generated ' + preparedCard.printedDate);
      }
      void triggerHaptic('success');
    } catch (error) {
      console.error('[Share] Emergency card action failed:', action, error);
      void triggerHaptic('error');
      Alert.alert(copy.emergencyCardErrorTitle, copy.emergencyCardErrorMessage);
    } finally {
      setEmergencyCardAction(null);
    }
  }, [
    copy.emergencyCardActionsTitle,
    copy.emergencyCardEmailDialogTitle,
    copy.emergencyCardErrorMessage,
    copy.emergencyCardErrorTitle,
    copy.emergencyCardPrintDialogTitle,
    copy.emergencyCardSaveDialogTitle,
    copy.emergencyCardShareUnavailableMessage,
    copy.emergencyCardWebFallbackMessage,
    emergencyCardAction,
    emergencyCardPrintCopy,
    logExport,
    logShare,
    record,
    translateSeverity,
  ]);

  const toggleSection = useCallback((key: ExportSectionKey) => {
    console.log('[Share] Toggling export section', key);
    setSelection((currentSelection) => ({
      ...currentSelection,
      [key]: !currentSelection[key],
    }));
    void triggerHaptic('select');
  }, []);

  const selectAllSections = useCallback(() => {
    console.log('[Share] Selecting all export sections');
    setSelection(getDefaultExportSelection());
    void triggerHaptic('success');
  }, []);

  const applySharePreset = useCallback((preset: SharePresetOption) => {
    console.log('[Share] Applying share preset', preset.key);
    setExportType(preset.exportType);
    setSelection({ ...preset.selection });
    setPreviewVisible(false);
    void triggerHaptic('select');
  }, []);

  const selectNameOnly = useCallback(() => {
    console.log('[Share] Reducing export selection to name only');
    setSelection(getNameOnlyExportSelection());
    void triggerHaptic('warning');
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      console.log('[Share] Copying export content', {
        exportType,
        selection: scopedSelection,
      });
      await Clipboard.setStringAsync(exportContent);
      setCopied(true);
      logExport('clipboard', exportType + ' export with ' + auditSelectionSummary);
      void triggerHaptic('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[Share] Copy failed:', error);
      void triggerHaptic('error');
      Alert.alert(copy.alertErrorTitle, copy.alertCopyFailed);
    }
  }, [
    auditSelectionSummary,
    copy.alertCopyFailed,
    copy.alertErrorTitle,
    exportContent,
    exportType,
    logExport,
    scopedSelection,
  ]);

  const sendApprovedEmail = useCallback(async () => {
    const recipient = email.trim();
    const subject = encodeURIComponent(copy.emailSubject);
    const body = encodeURIComponent(exportContent);
    const mailtoUrl = 'mailto:' + recipient + '?subject=' + subject + '&body=' + body;

    try {
      console.log('[Share] Opening email share', {
        recipient,
        exportType,
        selection: scopedSelection,
      });
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (!supported) {
        Alert.alert(copy.alertErrorTitle, copy.alertEmailUnsupported);
        return;
      }
      await Linking.openURL(mailtoUrl);
      logShare(recipient, exportType + ' export with ' + auditSelectionSummary);
      void triggerHaptic('success');
    } catch (error) {
      console.error('[Share] Email share failed:', error);
      void triggerHaptic('error');
      Alert.alert(copy.alertErrorTitle, copy.alertEmailOpenFailed);
    }
  }, [
    auditSelectionSummary,
    copy.alertEmailOpenFailed,
    copy.alertEmailUnsupported,
    copy.alertErrorTitle,
    copy.emailSubject,
    email,
    exportContent,
    exportType,
    logShare,
    scopedSelection,
  ]);

  const handleEmailShare = useCallback(() => {
    const recipient = email.trim();
    if (!recipient) {
      Alert.alert(copy.alertEmailRequiredTitle, copy.alertEmailRequiredMessage);
      return;
    }

    Alert.alert(
      copy.confirmShareTitle,
      interpolate(copy.confirmShareMessage, {
        recipient,
        items: confirmationItems,
      }),
      [
        {
          text: copy.confirmShareCancel,
          style: 'cancel',
        },
        {
          text: copy.confirmShareSend,
          onPress: () => {
            void sendApprovedEmail();
          },
        },
      ]
    );
  }, [
    copy.alertEmailRequiredMessage,
    copy.alertEmailRequiredTitle,
    copy.confirmShareCancel,
    copy.confirmShareMessage,
    copy.confirmShareSend,
    copy.confirmShareTitle,
    email,
    confirmationItems,
    sendApprovedEmail,
  ]);

  const copyButtonLabel = copied
    ? copy.copySuccess
    : exportType === 'fhir'
      ? copy.copyFhirRecord
      : exportType === 'full'
        ? copy.copyFullRecord
        : copy.copyEmergencyRecord;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.privacyCard}>
        <View style={styles.privacyHeader}>
          <ShieldCheck color={Colors.verified} size={20} />
          <Text style={styles.privacyTitle} accessibilityRole="header">{copy.privacyTitle}</Text>
        </View>
        <Text style={styles.privacyText}>{copy.privacyText}</Text>
        <TouchableOpacity
          style={styles.privacyPolicyInlineLink}
          onPress={() => {
            void openPrivacyPolicy();
          }}
          testID="share-privacy-policy"
        >
          <Text style={styles.privacyPolicyInlineText}>{copy.viewFullPrivacyPolicy}</Text>
          <ExternalLink color={Colors.verified} size={13} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.exportTypeTitle}</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, exportType === 'full' ? styles.toggleBtnActive : undefined]}
            onPress={() => {
              setExportType('full');
              void triggerHaptic('select');
            }}
            testID="export-full"
            accessibilityLabel={copy.exportFullAccessibility}
            accessibilityState={{ selected: exportType === 'full' }}
            accessibilityRole="button"
          >
            <FileText color={exportType === 'full' ? Colors.white : Colors.primary} size={16} />
            <Text style={[styles.toggleText, exportType === 'full' ? styles.toggleTextActive : undefined]}>
              {copy.exportFullLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, exportType === 'minimal' ? styles.toggleBtnActive : undefined]}
            onPress={() => {
              setExportType('minimal');
              void triggerHaptic('select');
            }}
            testID="export-minimal"
            accessibilityLabel={copy.exportMinimalAccessibility}
            accessibilityState={{ selected: exportType === 'minimal' }}
            accessibilityRole="button"
          >
            <Eye color={exportType === 'minimal' ? Colors.white : Colors.primary} size={16} />
            <Text style={[styles.toggleText, exportType === 'minimal' ? styles.toggleTextActive : undefined]}>
              {copy.exportMinimalLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.fhirToggle, exportType === 'fhir' ? styles.fhirToggleActive : undefined]}
          onPress={() => {
            setExportType('fhir');
            void triggerHaptic('select');
          }}
          testID="export-fhir"
        >
          <Braces color={exportType === 'fhir' ? Colors.white : Colors.primary} size={16} />
          <View style={styles.fhirToggleContent}>
            <Text style={[styles.toggleText, exportType === 'fhir' ? styles.toggleTextActive : undefined]}>
              {copy.exportFhirLabel}
            </Text>
            <Text style={[styles.fhirHint, exportType === 'fhir' ? styles.fhirHintActive : undefined]}>
              {fhirEnabled ? copy.exportFhirHintEnabled : copy.exportFhirHintPreview}
            </Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.exportHint}>
          {exportType === 'fhir'
            ? copy.exportHintFhir
            : exportType === 'full'
              ? copy.exportHintFull
              : copy.exportHintMinimal}{' '}
          {copy.exportHintShared}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.shareTemplateTitle}</Text>
        <View style={styles.templateCard}>
          <Text style={styles.templateDescription}>{copy.shareTemplateDescription}</Text>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateScrollContent}
            style={styles.templateScroll}
          >
            {sharePresets.map((preset) => {
              const selected = activeSharePreset === preset.key;
              return (
                <TouchableOpacity
                  key={preset.key}
                  style={[styles.templateOption, selected ? styles.templateOptionActive : undefined]}
                  onPress={() => applySharePreset(preset)}
                  testID={'share-preset-' + preset.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.templateOptionHeader}>
                    <Text style={[styles.templateOptionTitle, selected ? styles.templateOptionTitleActive : undefined]}>
                      {preset.label}
                    </Text>
                    {selected ? (
                      <View style={styles.templateOptionBadge}>
                        <CheckCircle color={Colors.white} size={12} />
                        <Text style={styles.templateOptionBadgeText}>{copy.shareTemplateActive}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.templateOptionDescription,
                      selected ? styles.templateOptionDescriptionActive : undefined,
                    ]}
                  >
                    {preset.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {activeSharePreset === 'custom' ? (
            <View style={styles.templateCustomBanner}>
              <Text style={styles.templateCustomBannerText}>
                {exportType === 'fhir' ? copy.shareTemplateFhirActive : copy.shareTemplateCustomActive}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.emergencyTemplateOption}
            onPress={() => {
              void triggerHaptic('select');
            }}
            testID="share-preset-emergency-card"
            accessibilityRole="button"
            accessibilityHint={copy.shareTemplateEmergencyCardHint}
          >
            <View style={styles.emergencyTemplateIconWrap}>
              <CreditCard color={Colors.white} size={20} />
            </View>
            <View style={styles.emergencyTemplateContent}>
              <Text style={styles.emergencyTemplateTitle}>{copy.shareTemplateEmergencyCard}</Text>
              <Text style={styles.emergencyTemplateDescription}>{copy.shareTemplateEmergencyCardHint}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.templateFootnote}>{copy.shareTemplateFineTune}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.emergencyCardActionsTitle}</Text>
        <View style={styles.emergencyCardPanel}>
          <View style={styles.emergencyCardPanelHeader}>
            <View style={styles.emergencyCardVisual}>
              <View style={styles.emergencyCardVisualStripe} />
              <View style={styles.emergencyCardVisualLineWide} />
              <View style={styles.emergencyCardVisualLine} />
            </View>
            <View style={styles.emergencyCardPanelCopy}>
              <Text style={styles.emergencyCardPanelTitle}>{copy.shareTemplateEmergencyCard}</Text>
              <Text style={styles.emergencyCardPanelText}>{copy.emergencyCardActionsDescription}</Text>
              <Text style={styles.emergencyCardDateText}>
                {interpolate(copy.emergencyCardDate, { date: emergencyCardPrintedDate })}
              </Text>
            </View>
          </View>
          <View style={styles.emergencyCardActionsRow}>
            <TouchableOpacity
              style={[styles.emergencyCardActionButton, emergencyCardAction ? styles.emergencyCardActionButtonDisabled : undefined]}
              onPress={() => handleEmergencyCardAction('save')}
              disabled={emergencyCardAction !== null}
              testID="emergency-card-save-download"
              accessibilityRole="button"
            >
              <Download color={Colors.white} size={16} />
              <Text style={styles.emergencyCardActionText}>
                {emergencyCardAction === 'save' ? copy.emergencyCardPreparing : copy.emergencyCardSaveDownload}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyCardActionButtonSecondary, emergencyCardAction ? styles.emergencyCardActionButtonDisabled : undefined]}
              onPress={() => handleEmergencyCardAction('email')}
              disabled={emergencyCardAction !== null}
              testID="emergency-card-email"
              accessibilityRole="button"
            >
              <Mail color={Colors.emergency} size={16} />
              <Text style={styles.emergencyCardActionSecondaryText}>
                {emergencyCardAction === 'email' ? copy.emergencyCardPreparing : copy.emergencyCardEmail}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.emergencyCardPrintButton, emergencyCardAction ? styles.emergencyCardActionButtonDisabled : undefined]}
            onPress={() => handleEmergencyCardAction('print')}
            disabled={emergencyCardAction !== null}
            testID="emergency-card-print"
            accessibilityRole="button"
          >
            <Printer color={Colors.primary} size={16} />
            <Text style={styles.emergencyCardPrintText}>
              {emergencyCardAction === 'print' ? copy.emergencyCardPreparing : copy.emergencyCardPrint}
            </Text>
          </TouchableOpacity>
          <View style={styles.emergencyCardShareNote}>
            <Lock color={Colors.textTertiary} size={12} />
            <Text style={styles.emergencyCardShareNoteText}>{copy.emergencyCardShareNote}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.shareSelectionTitle}</Text>
        <View style={styles.selectionCard}>
          <Text style={styles.selectionDescription}>{copy.shareSelectionDescription}</Text>
          <Text style={styles.selectionTip}>{copy.shareSelectionSpecialistHint}</Text>
          {exportType === 'minimal' ? (
            <Text style={styles.selectionSecondaryDescription}>{copy.shareSelectionMinimalDescription}</Text>
          ) : null}
          <View style={styles.selectionSummaryRow}>
            <View style={styles.selectionRequiredBadge}>
              <Text style={styles.selectionRequiredBadgeText}>{copy.shareSelectionNameRequired}</Text>
            </View>
            <Text style={styles.selectionSummaryText}>{selectionSummary}</Text>
          </View>
          <View style={styles.selectionActionsRow}>
            <TouchableOpacity
              style={styles.selectionActionButton}
              onPress={selectAllSections}
              testID="share-select-all"
            >
              <Text style={styles.selectionActionText}>{copy.shareSelectionQuickSelectAll}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionActionButtonSecondary}
              onPress={selectNameOnly}
              testID="share-select-name-only"
            >
              <Text style={styles.selectionActionSecondaryText}>{copy.shareSelectionQuickNameOnly}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.selectionList}>
            {sectionOptions.map((option) => {
              const enabled = scopedSelection[option.key];
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.selectionRow,
                    enabled ? styles.selectionRowEnabled : styles.selectionRowDisabled,
                  ]}
                  onPress={() => toggleSection(option.key)}
                  testID={'share-section-' + option.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: enabled }}
                >
                  <View style={styles.selectionRowContent}>
                    <Text style={styles.selectionRowTitle}>{option.label}</Text>
                    <Text style={styles.selectionRowDescription}>{option.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.selectionIndicator,
                      enabled ? styles.selectionIndicatorEnabled : styles.selectionIndicatorDisabled,
                    ]}
                  >
                    {enabled ? <Check color={Colors.white} size={14} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.shareReviewTitle}</Text>
        <View style={styles.reviewCard} testID="share-review-card">
          <Text style={styles.reviewDescription}>{copy.shareReviewDescription}</Text>
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>{copy.shareReviewIncludedTitle}</Text>
            <View style={styles.reviewChips}>
              {includedSectionLabels.map((label, index) => (
                <View
                  key={label + '-' + String(index)}
                  style={[styles.reviewChip, index === 0 ? styles.reviewChipLocked : undefined]}
                >
                  <Text
                    style={[styles.reviewChipText, index === 0 ? styles.reviewChipTextLocked : undefined]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>{copy.shareReviewExcludedTitle}</Text>
            <View style={styles.reviewChips}>
              {excludedSectionLabels.length > 0 ? (
                excludedSectionLabels.map((label, index) => (
                  <View key={label + '-excluded-' + String(index)} style={[styles.reviewChip, styles.reviewChipExcluded]}>
                    <Text style={[styles.reviewChipText, styles.reviewChipExcludedText]}>{label}</Text>
                  </View>
                ))
              ) : (
                <View style={[styles.reviewChip, styles.reviewChipEmpty]}>
                  <Text style={[styles.reviewChipText, styles.reviewChipEmptyText]}>{copy.shareReviewNothingExcluded}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.reviewFootnote}>{copy.shareReviewExcludedNote}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.shareEmailTitle}</Text>
        <View style={styles.emailCard}>
          <View style={styles.emailInputRow}>
            <Mail color={Colors.textTertiary} size={18} />
            <TextInput
              style={styles.emailInput}
              placeholder={copy.emailPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="share-email-input"
            />
          </View>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleEmailShare}
            testID="share-email-send"
          >
            <Share2 color={Colors.white} size={16} />
            <Text style={styles.sendBtnText}>{copy.sendToDoctor}</Text>
          </TouchableOpacity>
          <View style={styles.consentNote}>
            <Lock color={Colors.textTertiary} size={12} />
            <Text style={styles.consentText}>{copy.consentText}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.copyClipboardTitle}</Text>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={handleCopy}
          testID="share-copy"
        >
          {copied ? <CheckCircle color={Colors.verified} size={18} /> : <Copy color={Colors.primary} size={18} />}
          <Text style={[styles.copyBtnText, copied ? styles.copyBtnTextSuccess : undefined]}>{copyButtonLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.previewToggle}
          onPress={() => {
            setPreviewVisible((currentValue) => !currentValue);
            void triggerHaptic('select');
          }}
          testID="share-preview-toggle"
        >
          <Eye color={Colors.primary} size={16} />
          <Text style={styles.previewToggleText}>{copy.previewExport}</Text>
          {previewVisible ? (
            <ChevronUp color={Colors.primary} size={16} />
          ) : (
            <ChevronDown color={Colors.primary} size={16} />
          )}
        </TouchableOpacity>
        {previewVisible ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewMetaText}>{selectionSummary}</Text>
            <Text style={styles.previewText}>{exportContent}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.clinicalDisclaimerCard}>
        <View style={styles.clinicalDisclaimerHeader}>
          <AlertTriangle color={Colors.warning} size={16} />
          <Text style={styles.clinicalDisclaimerTitle}>{copy.clinicalDisclaimerTitle}</Text>
        </View>
        <Text style={styles.clinicalDisclaimerText}>{copy.clinicalDisclaimerText}</Text>
      </View>

      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>{copy.privacyCommitmentTitle}</Text>
        <Text style={styles.disclaimerText}>{copy.privacyCommitmentText}</Text>
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
    gap: 20,
  },
  privacyCard: {
    backgroundColor: Colors.verifiedLight,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.verified,
  },
  privacyText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 19,
  },
  privacyPolicyInlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  privacyPolicyInlineText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.verified,
    textDecorationLine: 'underline',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    paddingLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  exportHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  templateCard: {
    backgroundColor: '#EEF3F8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    paddingVertical: 14,
    gap: 12,
  },
  templateDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
    paddingHorizontal: 14,
  },
  templateScroll: {
    marginHorizontal: -14,
  },
  templateScrollContent: {
    gap: 12,
    paddingHorizontal: 14,
    paddingRight: 18,
  },
  templateOption: {
    width: 224,
    minHeight: 132,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    padding: 14,
    gap: 10,
    justifyContent: 'space-between',
  },
  templateOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  templateOptionHeader: {
    gap: 10,
  },
  templateOptionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  templateOptionTitleActive: {
    color: Colors.white,
  },
  templateOptionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  templateOptionDescriptionActive: {
    color: 'rgba(255,255,255,0.82)',
  },
  templateOptionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  templateOptionBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  templateCustomBanner: {
    marginHorizontal: 14,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateCustomBannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  templateFootnote: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.primary,
    paddingHorizontal: 14,
  },
  emergencyTemplateOption: {
    marginHorizontal: 14,
    backgroundColor: '#7F1D1D',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  emergencyTemplateIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTemplateContent: {
    flex: 1,
    gap: 3,
  },
  emergencyTemplateTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  emergencyTemplateDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: '#FEE2E2',
  },
  emergencyCardPanel: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.emergencyBorder,
    padding: 14,
    gap: 12,
    shadowColor: Colors.emergency,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emergencyCardPanelHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  emergencyCardVisual: {
    width: 82,
    height: 52,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.emergency,
    backgroundColor: '#FFF7F7',
    padding: 7,
    gap: 5,
  },
  emergencyCardVisualStripe: {
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.emergency,
  },
  emergencyCardVisualLineWide: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#991B1B',
  },
  emergencyCardVisualLine: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#FCA5A5',
  },
  emergencyCardPanelCopy: {
    flex: 1,
    gap: 4,
  },
  emergencyCardPanelTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  emergencyCardPanelText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  emergencyCardDateText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.emergency,
  },
  emergencyCardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emergencyCardActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: Colors.emergency,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  emergencyCardActionButtonSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: Colors.emergencyLight,
    borderWidth: 1,
    borderColor: Colors.emergencyBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  emergencyCardActionButtonDisabled: {
    opacity: 0.62,
  },
  emergencyCardActionText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.white,
    textAlign: 'center',
  },
  emergencyCardActionSecondaryText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.emergency,
    textAlign: 'center',
  },
  emergencyCardPrintButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BCD0E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emergencyCardPrintText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  emergencyCardShareNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emergencyCardShareNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  selectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  selectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
  },
  selectionSecondaryDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  selectionTip: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectionSummaryRow: {
    gap: 8,
  },
  selectionRequiredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectionRequiredBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  selectionSummaryText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  selectionActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionActionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionActionButtonSecondary: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionActionText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  selectionActionSecondaryText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  selectionList: {
    gap: 10,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectionRowEnabled: {
    backgroundColor: '#F8FBFF',
    borderColor: '#BCD0E5',
  },
  selectionRowDisabled: {
    backgroundColor: '#FAFAFA',
    borderColor: Colors.border,
  },
  selectionRowContent: {
    flex: 1,
    gap: 4,
  },
  selectionRowTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  selectionRowDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorEnabled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectionIndicatorDisabled: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  reviewCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4DEEA',
    padding: 14,
    gap: 12,
  },
  reviewDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
  },
  reviewSection: {
    gap: 8,
  },
  reviewSectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  reviewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewChip: {
    backgroundColor: Colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4DEEA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reviewChipLocked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reviewChipExcluded: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  reviewChipEmpty: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  reviewChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  reviewChipTextLocked: {
    color: Colors.white,
  },
  reviewChipExcludedText: {
    color: Colors.textSecondary,
  },
  reviewChipEmptyText: {
    color: Colors.textTertiary,
  },
  reviewFootnote: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  emailCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  emailInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emailInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  consentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  copyBtnTextSuccess: {
    color: Colors.verified,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  previewToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  previewMetaText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  previewText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.text,
    lineHeight: 18,
  },
  clinicalDisclaimerCard: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  clinicalDisclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clinicalDisclaimerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  clinicalDisclaimerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  disclaimerCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 6,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  fhirToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  fhirToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  fhirToggleContent: {
    flex: 1,
    gap: 1,
  },
  fhirHint: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  fhirHintActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  bottomSpacer: {
    height: 24,
  },
});
