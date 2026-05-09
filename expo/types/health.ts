export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  bloodType: string;
  religiousPreference: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface Allergy {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reaction: string;
  source: string;
  addedAt: string;
}

export type MedicationStatus = 'active' | 'discontinued';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  startDate: string;
  source: string;
  addedAt: string;
  status: MedicationStatus;
  discontinuedDate: string;
  labelPhotoUri?: string;
}

export interface MedicalCondition {
  id: string;
  name: string;
  diagnosedDate: string;
  status: 'current';
  notes: string;
  source: string;
  addedAt: string;
}

export interface Procedure {
  id: string;
  name: string;
  date: string;
  provider: string;
  notes: string;
  source: string;
  addedAt: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber: string;
  memberId: string;
  phone: string;
  planType: string;
}

export interface EmergencyNotes {
  content: string;
  updatedAt: string;
}

export type DocumentType = 'dnr' | 'organ_donor' | 'drivers_license' | 'medical_order' | 'other';

export interface MedicalDocument {
  id: string;
  type: DocumentType;
  label: string;
  fileUri: string;
  notes: string;
  addedAt: string;
  source: string;
  /** Original file name when imported from the device's Files app (e.g. an email attachment). */
  fileName?: string;
  /** MIME type, used to render PDFs and other non-image files correctly. */
  mimeType?: string;
  /** File size in bytes, when known. */
  fileSize?: number;
}

export type AuditAction =
  | 'record_viewed'
  | 'record_edited'
  | 'record_shared'
  | 'record_exported'
  | 'emergency_access'
  | 'record_imported'
  | 'medication_verified'
  | 'emergency_mode_entered'
  | 'emergency_mode_exited'
  | 'emergency_text_prepared'
  | 'document_added'
  | 'document_removed'
;

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  description: string;
  category: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface MedicationVerification {
  lastVerifiedAt: string;
  verifiedBy: 'user';
  status: 'verified' | 'changes_made' | 'stale';
}

export interface HealthRecord {
  personalInfo: PersonalInfo;
  emergencyContacts: EmergencyContact[];
  allergies: Allergy[];
  medications: Medication[];
  conditions: MedicalCondition[];
  procedures: Procedure[];
  insurance: InsuranceInfo;
  emergencyNotes: EmergencyNotes;
  medicationVerification: MedicationVerification;
  documents: MedicalDocument[];
  auditLog: AuditLogEntry[];
  lastUpdated: string;
  createdAt: string;
}

export const DEFAULT_PERSONAL_INFO: PersonalInfo = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  bloodType: '',
  religiousPreference: '',
};

export const DEFAULT_INSURANCE: InsuranceInfo = {
  provider: '',
  policyNumber: '',
  groupNumber: '',
  memberId: '',
  phone: '',
  planType: '',
};

export const DEFAULT_EMERGENCY_NOTES: EmergencyNotes = {
  content: '',
  updatedAt: '',
};

export const DEFAULT_MEDICATION_VERIFICATION: MedicationVerification = {
  lastVerifiedAt: '',
  verifiedBy: 'user',
  status: 'stale',
};

export const DEFAULT_HEALTH_RECORD: HealthRecord = {
  personalInfo: DEFAULT_PERSONAL_INFO,
  emergencyContacts: [],
  allergies: [],
  medications: [],
  conditions: [],
  procedures: [],
  insurance: DEFAULT_INSURANCE,
  emergencyNotes: DEFAULT_EMERGENCY_NOTES,
  medicationVerification: DEFAULT_MEDICATION_VERIFICATION,
  documents: [],
  auditLog: [],
  lastUpdated: '',
  createdAt: new Date().toISOString(),
};

export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown',
] as const;

export const SEVERITY_LEVELS = [
  { value: 'mild' as const, label: 'Mild', color: '#D97706' },
  { value: 'moderate' as const, label: 'Moderate', color: '#EA580C' },
  { value: 'severe' as const, label: 'Severe', color: '#DC2626' },
  { value: 'life-threatening' as const, label: 'Life-Threatening', color: '#991B1B' },
];

export const CONDITION_STATUSES = [
  { value: 'current' as const, label: 'Current' },
];

export const MEDICATION_STATUSES = [
  { value: 'active' as const, label: 'Active' },
  { value: 'discontinued' as const, label: 'Discontinued' },
];


export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'dnr', label: 'DNR Order' },
  { value: 'organ_donor', label: 'Organ Donor Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'medical_order', label: 'Medical Order' },
  { value: 'other', label: 'Other Document' },
];
