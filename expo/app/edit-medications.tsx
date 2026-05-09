import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/ScaledText';
import { Save, Plus, Trash2, CheckCircle, Clock, ScanLine } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { Medication, MEDICATION_STATUSES } from '@/types/health';
import { generateId } from '@/utils/audit';
import { formatRelativeTime, isStale } from '@/utils/format';

type MedicationDraft = Medication;

export default function EditMedicationsScreen() {
  const { record, updateMedications, updateMedicationsAndVerify, verifyMedications } = useHealthRecords();
  const [medications, setMedications] = useState<MedicationDraft[]>([...record.medications]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const medStale = isStale(record.medicationVerification.lastVerifiedAt, 30);
  const copy = usePhraseSet({
    verifiedTitle: 'Verified',
    verifiedMessage: 'Medication list confirmed as current.',
    medicationLabel: 'Medication {number}',
    medicationNameLabel: 'Medication Name',
    medicationNamePlaceholder: 'e.g. Lisinopril, Metformin',
    dosageLabel: 'Dosage',
    dosagePlaceholder: 'e.g. 10mg',
    frequencyLabel: 'Frequency',
    frequencyPlaceholder: 'e.g. Once daily',
    prescribedByLabel: 'Prescribed By',
    prescribedByPlaceholder: 'Doctor name',
    discontinuedDateLabel: 'Discontinued Date',
    discontinuedDatePlaceholder: 'MM/DD/YYYY',
    verificationNeeded: 'Verification Needed',
    medicationsVerified: 'Medications Verified',
    lastVerified: 'Last verified: {time}',
    noChanges: 'No Changes — Confirm Current',
    activeGroup: 'ACTIVE ({count})',
    discontinuedGroup: 'DISCONTINUED ({count})',
    addButton: 'Add Medication',
    scanButton: 'Scan Barcode / QR',
    saveVerifyButton: 'Save & Verify Changes',
    saveButton: 'Save Medications',
  });

  const handleSave = useCallback(() => {
    const valid = medications.filter((medication) => medication.name.trim());
    if (hasChanges) {
      updateMedicationsAndVerify(valid, 'changes_made');
    } else {
      updateMedications(valid);
    }
    console.log('[EditMedications] Saved medications:', valid.length);
    router.back();
  }, [hasChanges, medications, updateMedications, updateMedicationsAndVerify]);

  const handleNoChanges = useCallback(() => {
    verifyMedications('verified');
    Alert.alert(copy.verifiedTitle, copy.verifiedMessage);
    router.back();
  }, [copy.verifiedMessage, copy.verifiedTitle, verifyMedications]);

  const addMedication = useCallback(() => {
    const newMedication: MedicationDraft = {
      id: generateId(),
      name: '',
      dosage: '',
      frequency: '',
      prescribedBy: '',
      startDate: '',
      source: 'user',
      addedAt: new Date().toISOString(),
      status: 'active',
      discontinuedDate: '',
    };
    setMedications((prev) => [...prev, newMedication]);
    setHasChanges(true);
  }, []);

  const removeMedication = useCallback((id: string) => {
    setMedications((prev) => prev.filter((medication) => medication.id !== id));
    setHasChanges(true);
  }, []);

  const updateMedicationField = useCallback((id: string, field: keyof MedicationDraft, value: string) => {
    setMedications((prev) => prev.map((medication) => (medication.id === id ? { ...medication, [field]: value } : medication)));
    setHasChanges(true);
  }, []);

  const activeMeds = medications.filter((medication) => medication.status !== 'discontinued');
  const discontinuedMeds = medications.filter((medication) => medication.status === 'discontinued');

  const renderMedicationCard = (medication: MedicationDraft, index: number) => {
    const isDiscontinued = medication.status === 'discontinued';

    return (
      <View key={medication.id} style={[styles.medCard, isDiscontinued ? styles.medCardDiscontinued : undefined]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>{copy.medicationLabel.replace('{number}', String(index + 1))}</Text>
          <TouchableOpacity onPress={() => removeMedication(medication.id)}>
            <Trash2 color={Colors.emergency} size={16} />
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          {MEDICATION_STATUSES.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.statusChip,
                medication.status === status.value
                  ? status.value === 'active'
                    ? styles.statusChipActive
                    : styles.statusChipDiscontinued
                  : undefined,
              ]}
              onPress={() => updateMedicationField(medication.id, 'status', status.value)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  medication.status === status.value ? styles.statusChipTextActive : undefined,
                ]}
              >
                {String(status.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{copy.medicationNameLabel}</Text>
          <TextInput
            style={styles.input}
            value={medication.name}
            onChangeText={(value) => updateMedicationField(medication.id, 'name', value)}
            placeholder={copy.medicationNamePlaceholder}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>{copy.dosageLabel}</Text>
            <TextInput
              style={styles.input}
              value={medication.dosage}
              onChangeText={(value) => updateMedicationField(medication.id, 'dosage', value)}
              placeholder={copy.dosagePlaceholder}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <View style={styles.verticalDivider} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>{copy.frequencyLabel}</Text>
            <TextInput
              style={styles.input}
              value={medication.frequency}
              onChangeText={(value) => updateMedicationField(medication.id, 'frequency', value)}
              placeholder={copy.frequencyPlaceholder}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{copy.prescribedByLabel}</Text>
          <TextInput
            style={styles.input}
            value={medication.prescribedBy}
            onChangeText={(value) => updateMedicationField(medication.id, 'prescribedBy', value)}
            placeholder={copy.prescribedByPlaceholder}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        {isDiscontinued ? (
          <View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.discontinuedDateLabel}</Text>
              <TextInput
                style={styles.input}
                value={medication.discontinuedDate}
                onChangeText={(value) => updateMedicationField(medication.id, 'discontinuedDate', value)}
                placeholder={copy.discontinuedDatePlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.verifyCard, medStale ? styles.verifyCardStale : styles.verifyCardGood]}>
          <View style={styles.verifyHeader}>
            {medStale ? <Clock color={Colors.warning} size={18} /> : <CheckCircle color={Colors.verified} size={18} />}
            <Text style={[styles.verifyTitle, medStale ? styles.verifyTitleStale : styles.verifyTitleGood]}>
              {medStale ? copy.verificationNeeded : copy.medicationsVerified}
            </Text>
          </View>
          <Text style={styles.verifySubtext}>{copy.lastVerified.replace('{time}', formatRelativeTime(record.medicationVerification.lastVerifiedAt))}</Text>
          {medications.length > 0 ? (
            <TouchableOpacity style={styles.noChangesBtn} onPress={handleNoChanges} testID="meds-no-changes">
              <CheckCircle color={Colors.verified} size={16} />
              <Text style={styles.noChangesBtnText}>{copy.noChanges}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {activeMeds.length > 0 ? (
          <View style={styles.sectionGroup}>
            <Text style={styles.groupLabel}>{copy.activeGroup.replace('{count}', String(activeMeds.length))}</Text>
            {activeMeds.map((medication, index) => renderMedicationCard(medication, index))}
          </View>
        ) : null}
        {discontinuedMeds.length > 0 ? (
          <View style={styles.sectionGroup}>
            <Text style={styles.groupLabel}>{copy.discontinuedGroup.replace('{count}', String(discontinuedMeds.length))}</Text>
            {discontinuedMeds.map((medication, index) => renderMedicationCard(medication, activeMeds.length + index))}
          </View>
        ) : null}
        <View style={styles.addRow}>
          <TouchableOpacity style={[styles.addBtn, styles.addBtnHalf]} onPress={addMedication} testID="add-medication">
            <Plus color={Colors.primary} size={18} />
            <Text style={styles.addBtnText}>{copy.addButton}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, styles.addBtnHalf, styles.scanBtnSecondary]}
            onPress={() => router.push('/scanner')}
            testID="scan-medication"
          >
            <ScanLine color={Colors.primary} size={18} />
            <Text style={styles.addBtnText}>{copy.scanButton}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="meds-save">
          <Save color={Colors.white} size={18} />
          <Text style={styles.saveBtnText}>{hasChanges ? copy.saveVerifyButton : copy.saveButton}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  verifyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  verifyCardStale: {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warningBorder,
  },
  verifyCardGood: {
    backgroundColor: Colors.verifiedLight,
    borderColor: Colors.verifiedBorder,
  },
  verifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  verifyTitleStale: {
    color: Colors.warning,
  },
  verifyTitleGood: {
    color: Colors.verified,
  },
  verifySubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingLeft: 26,
  },
  noChangesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 6,
  },
  noChangesBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.verified,
  },
  sectionGroup: {
    gap: 10,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    paddingLeft: 4,
  },
  medCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  medCardDiscontinued: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingBottom: 6,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusChipActive: {
    backgroundColor: Colors.verified,
    borderColor: Colors.verified,
  },
  statusChipDiscontinued: {
    backgroundColor: Colors.textTertiary,
    borderColor: Colors.textTertiary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statusChipTextActive: {
    color: Colors.white,
  },
  inputGroup: {
    padding: 14,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 14,
  },
  row: {
    flexDirection: 'row',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: Colors.divider,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addBtnHalf: {
    flex: 1,
  },
  scanBtnSecondary: {
    backgroundColor: Colors.primaryLight,
    borderStyle: 'solid',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
