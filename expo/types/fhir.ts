export interface FHIRIdentifier {
  system: string;
  value: string;
}

export interface FHIRCoding {
  system: string;
  code: string;
  display: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text: string;
}

export interface FHIRReference {
  reference: string;
  display: string;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRHumanName {
  use: 'official' | 'usual' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  family: string;
  given: string[];
}

export interface FHIRContactPoint {
  system: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value: string;
  use: 'home' | 'work' | 'temp' | 'old' | 'mobile';
}

export interface FHIRAddress {
  use: 'home' | 'work' | 'temp' | 'old' | 'billing';
  line: string[];
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  name: FHIRHumanName[];
  telecom: FHIRContactPoint[];
  birthDate: string;
  address: FHIRAddress[];
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
  }>;
}

export interface FHIRAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  clinicalStatus: FHIRCodeableConcept;
  criticality: 'low' | 'high' | 'unable-to-assess';
  code: FHIRCodeableConcept;
  patient: FHIRReference;
  reaction?: Array<{
    manifestation: FHIRCodeableConcept[];
    severity: 'mild' | 'moderate' | 'severe';
  }>;
  recordedDate: string;
  note?: Array<{ text: string }>;
}

export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown' | 'not-taken';
  medicationCodeableConcept: FHIRCodeableConcept;
  subject: FHIRReference;
  effectivePeriod?: FHIRPeriod;
  dosage?: Array<{
    text: string;
    timing?: { code?: FHIRCodeableConcept };
  }>;
  informationSource?: FHIRReference;
  dateAsserted?: string;
}

export interface FHIRCondition {
  resourceType: 'Condition';
  id: string;
  clinicalStatus: FHIRCodeableConcept;
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  onsetDateTime?: string;
  note?: Array<{ text: string }>;
  recordedDate: string;
}

export interface FHIRProcedure {
  resourceType: 'Procedure';
  id: string;
  status: 'completed' | 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'entered-in-error' | 'unknown';
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  performedDateTime?: string;
  performer?: Array<{
    actor: FHIRReference;
  }>;
  note?: Array<{ text: string }>;
}

export interface FHIRCoverage {
  resourceType: 'Coverage';
  id: string;
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  type?: FHIRCodeableConcept;
  subscriber?: FHIRReference;
  subscriberId?: string;
  payor: FHIRReference[];
  class?: Array<{
    type: FHIRCodeableConcept;
    value: string;
    name?: string;
  }>;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'collection' | 'document' | 'message' | 'transaction' | 'searchset';
  timestamp: string;
  entry: Array<{
    resource: FHIRPatient | FHIRAllergyIntolerance | FHIRMedicationStatement | FHIRCondition | FHIRProcedure | FHIRCoverage;
  }>;
  meta?: {
    source: string;
    versionId: string;
  };
}

export type FHIRResource =
  | FHIRPatient
  | FHIRAllergyIntolerance
  | FHIRMedicationStatement
  | FHIRCondition
  | FHIRProcedure
  | FHIRCoverage;
