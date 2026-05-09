import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  HealthRecord,
  DEFAULT_HEALTH_RECORD,
  DEFAULT_PERSONAL_INFO,
  DEFAULT_INSURANCE,
  DEFAULT_EMERGENCY_NOTES,
  DEFAULT_MEDICATION_VERIFICATION,
  PersonalInfo,
  EmergencyContact,
  Allergy,
  Medication,
  MedicalCondition,
  Procedure,
  InsuranceInfo,
  EmergencyNotes,
  MedicalDocument,
  AuditLogEntry,
} from '@/types/health';
import { createAuditEntry, generateId } from '@/utils/audit';
import { encryptData, decryptData } from '@/utils/encryption';
import { useAuth } from '@/providers/AuthProvider';
import { DEMO_HEALTH_RECORD } from '@/constants/demoData';

const STORAGE_KEY_SUFFIX = 'records';
const AUDIT_STORAGE_KEY_SUFFIX = 'audit';
const ONBOARDING_KEY_SUFFIX = 'onboarding';

function getUserStorageKey(userId: string, suffix: string): string {
  return '@myrecordsmyhealth:' + userId + ':' + suffix;
}

function migrateRecord(parsed: Record<string, unknown>): HealthRecord {
  const personalInfo = {
    ...DEFAULT_PERSONAL_INFO,
    ...(parsed.personalInfo as Record<string, unknown> ?? {}),
  };
  const insurance = {
    ...DEFAULT_INSURANCE,
    ...(parsed.insurance as Record<string, unknown> ?? {}),
  };
  const emergencyNotes = {
    ...DEFAULT_EMERGENCY_NOTES,
    ...(parsed.emergencyNotes as Record<string, unknown> ?? {}),
  };
  const medicationVerification = {
    ...DEFAULT_MEDICATION_VERIFICATION,
    ...(parsed.medicationVerification as Record<string, unknown> ?? {}),
  };

  const rawMeds = (parsed.medications as Medication[] ?? []);
  const medications: Medication[] = rawMeds.map((m) => ({
    ...m,
    status: m.status || 'active',
    discontinuedDate: m.discontinuedDate || '',
  }));

  const rawConditions = (parsed.conditions as MedicalCondition[] ?? []);
  const conditions: MedicalCondition[] = rawConditions.map((c) => ({
    ...c,
    status: 'current' as const,
  }));

  return {
    personalInfo: personalInfo as PersonalInfo,
    emergencyContacts: (parsed.emergencyContacts as EmergencyContact[]) ?? [],
    allergies: (parsed.allergies as Allergy[]) ?? [],
    medications,
    conditions,
    procedures: (parsed.procedures as Procedure[]) ?? [],
    insurance: insurance as InsuranceInfo,
    emergencyNotes: emergencyNotes as EmergencyNotes,
    medicationVerification: medicationVerification as HealthRecord['medicationVerification'],
    documents: (parsed.documents as MedicalDocument[]) ?? [],
    auditLog: (parsed.auditLog as AuditLogEntry[]) ?? [],
    lastUpdated: (parsed.lastUpdated as string) ?? '',
    createdAt: (parsed.createdAt as string) ?? new Date().toISOString(),
  };
}

async function loadRecord(userId: string): Promise<HealthRecord> {
  try {
    const stored = await AsyncStorage.getItem(getUserStorageKey(userId, STORAGE_KEY_SUFFIX));
    if (stored) {
      const decrypted = await decryptData(stored);
      const parsed = JSON.parse(decrypted) as Record<string, unknown>;
      console.log('[HealthRecords] Loaded record from storage (encrypted:', stored.startsWith('ENC:'), ')');
      return migrateRecord(parsed);
    }
    if (userId === 'demo-user') {
      console.log('[HealthRecords] Seeding demo record for reviewer account');
      const seeded = { ...DEMO_HEALTH_RECORD };
      const json = JSON.stringify(seeded);
      const encrypted = await encryptData(json);
      await AsyncStorage.setItem(getUserStorageKey(userId, STORAGE_KEY_SUFFIX), encrypted);
      await AsyncStorage.setItem(getUserStorageKey(userId, ONBOARDING_KEY_SUFFIX), 'complete');
      return seeded;
    }
  } catch (e) {
    console.error('[HealthRecords] Error loading record:', e);
  }
  return { ...DEFAULT_HEALTH_RECORD, createdAt: new Date().toISOString() };
}

async function saveRecord(userId: string, record: HealthRecord): Promise<HealthRecord> {
  try {
    const updated = { ...record, lastUpdated: new Date().toISOString() };
    const json = JSON.stringify(updated);
    const encrypted = await encryptData(json);
    await AsyncStorage.setItem(getUserStorageKey(userId, STORAGE_KEY_SUFFIX), encrypted);
    console.log('[HealthRecords] Saved record to encrypted storage');
    return updated;
  } catch (e) {
    console.error('[HealthRecords] Error saving record:', e);
    throw e;
  }
}

async function loadAuditLog(userId: string): Promise<AuditLogEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(getUserStorageKey(userId, AUDIT_STORAGE_KEY_SUFFIX));
    if (stored) {
      return JSON.parse(stored) as AuditLogEntry[];
    }
  } catch (e) {
    console.error('[HealthRecords] Error loading audit log:', e);
  }
  return [];
}

async function saveAuditLog(userId: string, log: AuditLogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(getUserStorageKey(userId, AUDIT_STORAGE_KEY_SUFFIX), JSON.stringify(log));
  } catch (e) {
    console.error('[HealthRecords] Error saving audit log:', e);
  }
}

function buildAuditMetadata(entries: Array<[string, string | undefined]>): Record<string, string> | undefined {
  const metadata = entries.reduce<Record<string, string>>((accumulator, [key, value]) => {
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (trimmedValue.length > 0) {
        accumulator[key] = trimmedValue;
      }
    }
    return accumulator;
  }, {});

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function summarizeNames(values: string[], limit: number = 3): string {
  const cleanedValues = values.map((value) => value.trim()).filter(Boolean);

  if (cleanedValues.length === 0) {
    return '';
  }

  const visibleValues = cleanedValues.slice(0, limit);
  return cleanedValues.length > limit
    ? visibleValues.join(', ') + ', +' + String(cleanedValues.length - limit) + ' more'
    : visibleValues.join(', ');
}

async function loadOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(getUserStorageKey(userId, ONBOARDING_KEY_SUFFIX));
    return stored === 'complete';
  } catch (e) {
    console.error('[HealthRecords] Error loading onboarding status:', e);
    return false;
  }
}

export const [HealthRecordsProvider, useHealthRecords] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';
  const [record, setRecord] = useState<HealthRecord>(DEFAULT_HEALTH_RECORD);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(true);
  const [isOnboardingLoaded, setIsOnboardingLoaded] = useState<boolean>(false);

  const recordQuery = useQuery({
    queryKey: ['healthRecord', userId],
    queryFn: () => loadRecord(userId),
  });

  const auditQuery = useQuery({
    queryKey: ['auditLog', userId],
    queryFn: () => loadAuditLog(userId),
  });

  useEffect(() => {
    setRecord({ ...DEFAULT_HEALTH_RECORD, createdAt: new Date().toISOString() });
    setAuditLog([]);
    setIsLoaded(false);
    setIsOnboardingComplete(false);
    setIsOnboardingLoaded(false);

    loadOnboardingStatus(userId).then((status) => {
      setIsOnboardingComplete(status);
      setIsOnboardingLoaded(true);
      console.log('[HealthRecords] Onboarding status for user', userId + ':', status ? 'complete' : 'pending');
    });
  }, [userId]);

  useEffect(() => {
    if (recordQuery.data) {
      setRecord(recordQuery.data);
      setIsLoaded(true);
    }
  }, [recordQuery.data]);

  useEffect(() => {
    if (auditQuery.data) {
      setAuditLog(auditQuery.data);
    }
  }, [auditQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (nextRecord: HealthRecord) => saveRecord(userId, nextRecord),
    onSuccess: (data) => {
      setRecord(data);
      queryClient.setQueryData(['healthRecord', userId], data);
    },
  });

  const addAuditEntryFn = useCallback(
    (entry: AuditLogEntry) => {
      setAuditLog((prev) => {
        const updated = [entry, ...prev].slice(0, 500);
        void saveAuditLog(userId, updated);
        return updated;
      });
    },
    [userId]
  );

  const logAction = useCallback(
    (action: AuditLogEntry['action'], description: string, category: string, metadata?: Record<string, string>) => {
      const entry = createAuditEntry(action, description, category, metadata);
      addAuditEntryFn(entry);
      console.log('[Audit] ' + action + ': ' + description, metadata ?? {});
    },
    [addAuditEntryFn]
  );

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(getUserStorageKey(userId, ONBOARDING_KEY_SUFFIX), 'complete');
      setIsOnboardingComplete(true);
      console.log('[HealthRecords] Onboarding marked complete');
    } catch (e) {
      console.error('[HealthRecords] Error saving onboarding status:', e);
    }
  }, [userId]);

  const updatePersonalInfo = useCallback(
    (info: PersonalInfo) => {
      const changedFields = [
        record.personalInfo.firstName !== info.firstName || record.personalInfo.lastName !== info.lastName ? 'name' : '',
        record.personalInfo.dateOfBirth !== info.dateOfBirth ? 'date of birth' : '',
        record.personalInfo.addressLine1 !== info.addressLine1 ||
        record.personalInfo.addressLine2 !== info.addressLine2 ||
        record.personalInfo.city !== info.city ||
        record.personalInfo.state !== info.state ||
        record.personalInfo.zipCode !== info.zipCode
          ? 'address'
          : '',
        record.personalInfo.phone !== info.phone ? 'phone number' : '',
        record.personalInfo.bloodType !== info.bloodType ? 'blood type' : '',
        record.personalInfo.religiousPreference !== info.religiousPreference ? 'religious preference' : '',
      ].filter((value): value is string => Boolean(value));
      const updated = { ...record, personalInfo: info };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated personal information',
        'Personal Info',
        buildAuditMetadata([
          [
            'detail',
            changedFields.length > 0
              ? 'Updated personal info fields: ' + changedFields.join(', ') + '.'
              : 'Saved personal info with no specific field changes detected.',
          ],
          ['changedFields', changedFields.join(', ')],
          ['result', 'Personal info saved'],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateEmergencyContacts = useCallback(
    (contacts: EmergencyContact[]) => {
      const primaryContact = contacts.find((contact) => contact.isPrimary)?.name ?? '';
      const updated = { ...record, emergencyContacts: contacts };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated emergency contacts',
        'Emergency Contacts',
        buildAuditMetadata([
          ['detail', 'Saved ' + String(contacts.length) + ' emergency contact(s).' + (primaryContact ? ' Primary contact: ' + primaryContact + '.' : '')],
          ['itemName', summarizeNames(contacts.map((contact) => contact.name))],
          ['nextCount', String(contacts.length)],
          ['note', primaryContact ? 'Primary contact is ' + primaryContact + '.' : 'No primary contact selected.'],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const addAllergy = useCallback(
    (allergy: Omit<Allergy, 'id' | 'addedAt'>) => {
      const newAllergy: Allergy = {
        ...allergy,
        id: generateId(),
        addedAt: new Date().toISOString(),
      };
      const updated = { ...record, allergies: [...record.allergies, newAllergy] };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Added allergy: ' + allergy.name,
        'Allergies',
        buildAuditMetadata([
          ['detail', 'Added allergy ' + allergy.name + ' with ' + allergy.severity + ' severity.' + (allergy.reaction ? ' Reaction noted: ' + allergy.reaction + '.' : '')],
          ['itemName', allergy.name],
          ['nextCount', String(updated.allergies.length)],
          ['note', allergy.source ? 'Source: ' + allergy.source + '.' : undefined],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const removeAllergy = useCallback(
    (id: string) => {
      const allergy = record.allergies.find((a) => a.id === id);
      const updated = { ...record, allergies: record.allergies.filter((a) => a.id !== id) };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Removed allergy: ' + (allergy?.name ?? 'unknown'),
        'Allergies',
        buildAuditMetadata([
          ['detail', 'Removed allergy ' + (allergy?.name ?? 'unknown') + ' from the record.'],
          ['itemName', allergy?.name ?? 'unknown'],
          ['nextCount', String(updated.allergies.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateAllergies = useCallback(
    (allergies: Allergy[]) => {
      const updated = { ...record, allergies };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated allergies',
        'Allergies',
        buildAuditMetadata([
          ['detail', 'Saved allergies list with ' + String(allergies.length) + ' item(s).'],
          ['itemName', summarizeNames(allergies.map((allergy) => allergy.name))],
          ['nextCount', String(allergies.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const addMedication = useCallback(
    (medication: Omit<Medication, 'id' | 'addedAt'>) => {
      const newMed: Medication = {
        ...medication,
        id: generateId(),
        addedAt: new Date().toISOString(),
      };
      const updated = { ...record, medications: [...record.medications, newMed] };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Added medication: ' + medication.name,
        'Medications',
        buildAuditMetadata([
          ['detail', 'Added medication ' + medication.name + (medication.dosage ? ' at ' + medication.dosage : '') + (medication.frequency ? ' with frequency ' + medication.frequency : '') + '.'],
          ['itemName', medication.name],
          ['nextCount', String(updated.medications.length)],
          ['note', medication.source ? 'Source: ' + medication.source + '.' : undefined],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const removeMedication = useCallback(
    (id: string) => {
      const med = record.medications.find((m) => m.id === id);
      const updated = { ...record, medications: record.medications.filter((m) => m.id !== id) };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Removed medication: ' + (med?.name ?? 'unknown'),
        'Medications',
        buildAuditMetadata([
          ['detail', 'Removed medication ' + (med?.name ?? 'unknown') + ' from the record.'],
          ['itemName', med?.name ?? 'unknown'],
          ['nextCount', String(updated.medications.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateMedications = useCallback(
    (medications: Medication[]) => {
      const updated = { ...record, medications };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated medications',
        'Medications',
        buildAuditMetadata([
          ['detail', 'Saved medication list with ' + String(medications.length) + ' medication(s).'],
          ['itemName', summarizeNames(medications.map((medication) => medication.name))],
          ['nextCount', String(medications.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const verifyMedications = useCallback(
    (status: 'verified' | 'changes_made') => {
      const verification = {
        lastVerifiedAt: new Date().toISOString(),
        verifiedBy: 'user' as const,
        status,
      };
      const updated = { ...record, medicationVerification: verification };
      saveMutation.mutate(updated);
      logAction(
        'medication_verified',
        'Medications ' + (status === 'verified' ? 'confirmed (no changes)' : 'updated (changes made)'),
        'Medications',
        buildAuditMetadata([
          ['detail', status === 'verified' ? 'User confirmed the medication list is correct with no changes.' : 'User reviewed medications and confirmed changes were made.'],
          ['result', status === 'verified' ? 'Verified with no changes' : 'Verified after changes'],
          ['nextCount', String(record.medications.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateMedicationsAndVerify = useCallback(
    (medications: Medication[], status: 'verified' | 'changes_made') => {
      const verification = {
        lastVerifiedAt: new Date().toISOString(),
        verifiedBy: 'user' as const,
        status,
      };
      const updated = { ...record, medications, medicationVerification: verification };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated medications',
        'Medications',
        buildAuditMetadata([
          ['detail', 'Saved medication list with ' + String(medications.length) + ' medication(s) during verification.'],
          ['itemName', summarizeNames(medications.map((medication) => medication.name))],
          ['nextCount', String(medications.length)],
        ])
      );
      logAction(
        'medication_verified',
        'Medications ' + (status === 'verified' ? 'confirmed (no changes)' : 'updated (changes made)'),
        'Medications',
        buildAuditMetadata([
          ['detail', status === 'verified' ? 'User confirmed medications during review with no changes.' : 'User reviewed medications and saved updates during verification.'],
          ['result', status === 'verified' ? 'Verified with no changes' : 'Verified after changes'],
        ])
      );
      console.log('[HealthRecords] Saved medications and verification in single operation');
    },
    [record, saveMutation, logAction]
  );

  const addCondition = useCallback(
    (condition: Omit<MedicalCondition, 'id' | 'addedAt'>) => {
      const newCondition: MedicalCondition = {
        ...condition,
        id: generateId(),
        addedAt: new Date().toISOString(),
      };
      const updated = { ...record, conditions: [...record.conditions, newCondition] };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Added condition: ' + condition.name,
        'Conditions',
        buildAuditMetadata([
          ['detail', 'Added condition ' + condition.name + (condition.diagnosedDate ? ' with diagnosis date ' + condition.diagnosedDate : '') + '.'],
          ['itemName', condition.name],
          ['nextCount', String(updated.conditions.length)],
          ['note', condition.notes ? condition.notes : undefined],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const removeCondition = useCallback(
    (id: string) => {
      const cond = record.conditions.find((c) => c.id === id);
      const updated = { ...record, conditions: record.conditions.filter((c) => c.id !== id) };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Removed condition: ' + (cond?.name ?? 'unknown'),
        'Conditions',
        buildAuditMetadata([
          ['detail', 'Removed condition ' + (cond?.name ?? 'unknown') + ' from the record.'],
          ['itemName', cond?.name ?? 'unknown'],
          ['nextCount', String(updated.conditions.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateConditions = useCallback(
    (conditions: MedicalCondition[]) => {
      const updated = { ...record, conditions };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated conditions',
        'Conditions',
        buildAuditMetadata([
          ['detail', 'Saved conditions list with ' + String(conditions.length) + ' item(s).'],
          ['itemName', summarizeNames(conditions.map((condition) => condition.name))],
          ['nextCount', String(conditions.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const addProcedure = useCallback(
    (procedure: Omit<Procedure, 'id' | 'addedAt'>) => {
      const newProc: Procedure = {
        ...procedure,
        id: generateId(),
        addedAt: new Date().toISOString(),
      };
      const updated = { ...record, procedures: [...record.procedures, newProc] };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Added procedure: ' + procedure.name,
        'Procedures',
        buildAuditMetadata([
          ['detail', 'Added procedure ' + procedure.name + (procedure.date ? ' on ' + procedure.date : '') + '.'],
          ['itemName', procedure.name],
          ['nextCount', String(updated.procedures.length)],
          ['note', procedure.provider ? 'Provider: ' + procedure.provider + '.' : procedure.notes || undefined],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const removeProcedure = useCallback(
    (id: string) => {
      const proc = record.procedures.find((p) => p.id === id);
      const updated = { ...record, procedures: record.procedures.filter((p) => p.id !== id) };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Removed procedure: ' + (proc?.name ?? 'unknown'),
        'Procedures',
        buildAuditMetadata([
          ['detail', 'Removed procedure ' + (proc?.name ?? 'unknown') + ' from the record.'],
          ['itemName', proc?.name ?? 'unknown'],
          ['nextCount', String(updated.procedures.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateProcedures = useCallback(
    (procedures: Procedure[]) => {
      const updated = { ...record, procedures };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated procedures',
        'Procedures',
        buildAuditMetadata([
          ['detail', 'Saved procedures list with ' + String(procedures.length) + ' item(s).'],
          ['itemName', summarizeNames(procedures.map((procedure) => procedure.name))],
          ['nextCount', String(procedures.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateInsurance = useCallback(
    (insurance: InsuranceInfo) => {
      const changedFields = [
        record.insurance.provider !== insurance.provider ? 'provider' : '',
        record.insurance.policyNumber !== insurance.policyNumber ? 'policy number' : '',
        record.insurance.groupNumber !== insurance.groupNumber ? 'group number' : '',
        record.insurance.memberId !== insurance.memberId ? 'member ID' : '',
        record.insurance.phone !== insurance.phone ? 'phone number' : '',
        record.insurance.planType !== insurance.planType ? 'plan type' : '',
      ].filter((value): value is string => Boolean(value));
      const updated = { ...record, insurance };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated insurance information',
        'Insurance',
        buildAuditMetadata([
          [
            'detail',
            changedFields.length > 0
              ? 'Updated insurance fields: ' + changedFields.join(', ') + '.'
              : 'Saved insurance information with no specific field changes detected.',
          ],
          ['changedFields', changedFields.join(', ')],
          ['result', 'Insurance information saved'],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateEmergencyNotes = useCallback(
    (notes: EmergencyNotes) => {
      const updated = {
        ...record,
        emergencyNotes: { ...notes, updatedAt: new Date().toISOString() },
      };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated emergency notes',
        'Emergency Notes',
        buildAuditMetadata([
          ['detail', notes.content.trim() ? 'Updated emergency notes content.' : 'Cleared emergency notes content.'],
          ['result', notes.content.trim() ? 'Emergency notes saved' : 'Emergency notes cleared'],
          ['note', notes.content.trim().slice(0, 140)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const updateDocuments = useCallback(
    (documents: MedicalDocument[]) => {
      const updated = { ...record, documents };
      saveMutation.mutate(updated);
      logAction(
        'record_edited',
        'Updated documents',
        'Documents',
        buildAuditMetadata([
          ['detail', 'Saved documents list with ' + String(documents.length) + ' item(s).'],
          ['itemName', summarizeNames(documents.map((document) => document.label))],
          ['nextCount', String(documents.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const addDocument = useCallback(
    (doc: Omit<MedicalDocument, 'id' | 'addedAt'>) => {
      const newDoc: MedicalDocument = {
        ...doc,
        id: generateId(),
        addedAt: new Date().toISOString(),
      };
      const updated = { ...record, documents: [...record.documents, newDoc] };
      saveMutation.mutate(updated);
      logAction(
        'document_added',
        'Added document: ' + doc.label,
        'Documents',
        buildAuditMetadata([
          ['detail', 'Added document ' + doc.label + ' to the record.'],
          ['itemName', doc.label],
          ['nextCount', String(updated.documents.length)],
          ['note', doc.notes ? doc.notes : 'Type: ' + doc.type],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const removeDocument = useCallback(
    (id: string) => {
      const doc = record.documents.find((d) => d.id === id);
      const updated = { ...record, documents: record.documents.filter((d) => d.id !== id) };
      saveMutation.mutate(updated);
      logAction(
        'document_removed',
        'Removed document: ' + (doc?.label ?? 'unknown'),
        'Documents',
        buildAuditMetadata([
          ['detail', 'Removed document ' + (doc?.label ?? 'unknown') + ' from the record.'],
          ['itemName', doc?.label ?? 'unknown'],
          ['nextCount', String(updated.documents.length)],
        ])
      );
    },
    [record, saveMutation, logAction]
  );

  const logEmergencyAccess = useCallback(() => {
    logAction(
      'emergency_mode_entered',
      'Emergency view accessed',
      'Emergency',
      buildAuditMetadata([
        ['detail', 'Opened the emergency view.'],
        ['result', 'Emergency view active'],
      ])
    );
  }, [logAction]);

  const logExport = useCallback(
    (method: string, detail?: string) => {
      logAction(
        'record_exported',
        'Record exported via ' + method,
        'Export',
        buildAuditMetadata([
          ['detail', detail ? 'Exported the record using ' + method + ' with ' + detail + '.' : 'Exported the record using ' + method + '.'],
          ['result', 'Export complete'],
          ['note', detail ? 'Export method: ' + method + ' • ' + detail : 'Export method: ' + method],
        ])
      );
    },
    [logAction]
  );

  const logShare = useCallback(
    (recipient: string, detail?: string) => {
      logAction(
        'record_shared',
        'Record shared with ' + recipient,
        'Share',
        buildAuditMetadata([
          ['detail', detail ? 'Shared the record with ' + recipient + ' with ' + detail + '.' : 'Shared the record with ' + recipient + '.'],
          ['result', 'Record shared'],
          ['note', detail ? 'Recipient: ' + recipient + ' • ' + detail : 'Recipient: ' + recipient],
        ])
      );
    },
    [logAction]
  );

  const resetAllData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(getUserStorageKey(userId, STORAGE_KEY_SUFFIX));
      await AsyncStorage.removeItem(getUserStorageKey(userId, AUDIT_STORAGE_KEY_SUFFIX));
      await AsyncStorage.removeItem(getUserStorageKey(userId, ONBOARDING_KEY_SUFFIX));
      setRecord({ ...DEFAULT_HEALTH_RECORD, createdAt: new Date().toISOString() });
      setAuditLog([]);
      setIsOnboardingComplete(false);
      queryClient.setQueryData(['healthRecord', userId], { ...DEFAULT_HEALTH_RECORD, createdAt: new Date().toISOString() });
      queryClient.setQueryData(['auditLog', userId], []);
      console.log('[HealthRecords] Full reset complete for user', userId);
    } catch (e) {
      console.error('[HealthRecords] Reset failed:', e);
      throw e;
    }
  }, [queryClient, userId]);

  return useMemo(() => ({
    record,
    auditLog,
    isLoaded,
    isLoading: recordQuery.isLoading,
    isSaving: saveMutation.isPending,
    isOnboardingComplete,
    isOnboardingLoaded,
    completeOnboarding,
    updatePersonalInfo,
    updateEmergencyContacts,
    addAllergy,
    removeAllergy,
    updateAllergies,
    addMedication,
    removeMedication,
    updateMedications,
    verifyMedications,
    updateMedicationsAndVerify,
    addCondition,
    removeCondition,
    updateConditions,
    addProcedure,
    removeProcedure,
    updateProcedures,
    updateInsurance,
    updateEmergencyNotes,
    updateDocuments,
    addDocument,
    removeDocument,
    logEmergencyAccess,
    logExport,
    logShare,
    logAction,
    resetAllData,
  }), [
    record,
    auditLog,
    isLoaded,
    recordQuery.isLoading,
    saveMutation.isPending,
    isOnboardingComplete,
    isOnboardingLoaded,
    completeOnboarding,
    updatePersonalInfo,
    updateEmergencyContacts,
    addAllergy,
    removeAllergy,
    updateAllergies,
    addMedication,
    removeMedication,
    updateMedications,
    verifyMedications,
    updateMedicationsAndVerify,
    addCondition,
    removeCondition,
    updateConditions,
    addProcedure,
    removeProcedure,
    updateProcedures,
    updateInsurance,
    updateEmergencyNotes,
    updateDocuments,
    addDocument,
    removeDocument,
    logEmergencyAccess,
    logExport,
    logShare,
    logAction,
    resetAllData,
  ]);
});
