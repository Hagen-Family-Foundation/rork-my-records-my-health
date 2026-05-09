import {
  FHIRPatient,
  FHIRAllergyIntolerance,
  FHIRMedicationStatement,
  FHIRCondition,
  FHIRProcedure,
  FHIRCoverage,
  FHIRBundle,
} from '@/types/fhir';
import {
  HealthRecord,
  PersonalInfo,
  Allergy,
  Medication,
  MedicalCondition,
  Procedure,
  InsuranceInfo,
} from '@/types/health';

const SYSTEM_URI = 'urn:myrecordsmyhealth:local';
const PATIENT_REF = 'Patient/local';

function severityToFHIRCriticality(severity: Allergy['severity']): 'low' | 'high' | 'unable-to-assess' {
  switch (severity) {
    case 'life-threatening':
    case 'severe':
      return 'high';
    case 'moderate':
      return 'low';
    case 'mild':
      return 'low';
    default:
      return 'unable-to-assess';
  }
}

function severityToFHIRReactionSeverity(severity: Allergy['severity']): 'mild' | 'moderate' | 'severe' {
  switch (severity) {
    case 'life-threatening':
    case 'severe':
      return 'severe';
    case 'moderate':
      return 'moderate';
    case 'mild':
      return 'mild';
    default:
      return 'moderate';
  }
}

function medStatusToFHIR(status: Medication['status']): FHIRMedicationStatement['status'] {
  return status === 'discontinued' ? 'stopped' : 'active';
}

export function personalInfoToFHIRPatient(info: PersonalInfo): FHIRPatient {
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: 'local',
    name: [{
      use: 'official',
      family: info.lastName,
      given: info.firstName ? [info.firstName] : [],
    }],
    telecom: [],
    birthDate: info.dateOfBirth,
    address: [],
  };

  if (info.phone) {
    patient.telecom.push({
      system: 'phone',
      value: info.phone,
      use: 'home',
    });
  }

  if (info.addressLine1 || info.city || info.state) {
    const lines = [info.addressLine1, info.addressLine2].filter(Boolean);
    patient.address.push({
      use: 'home',
      line: lines,
      city: info.city,
      state: info.state,
      postalCode: info.zipCode,
      country: 'US',
    });
  }

  const extensions: FHIRPatient['extension'] = [];
  if (info.bloodType) {
    extensions.push({
      url: 'urn:myrecordsmyhealth:bloodType',
      valueString: info.bloodType,
    });
  }
  if (info.religiousPreference) {
    extensions.push({
      url: 'urn:myrecordsmyhealth:religiousPreference',
      valueString: info.religiousPreference,
    });
  }
  if (extensions.length > 0) {
    patient.extension = extensions;
  }

  return patient;
}

export function allergyToFHIR(allergy: Allergy): FHIRAllergyIntolerance {
  const resource: FHIRAllergyIntolerance = {
    resourceType: 'AllergyIntolerance',
    id: allergy.id,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' }],
      text: 'Active',
    },
    criticality: severityToFHIRCriticality(allergy.severity),
    code: {
      coding: [{ system: SYSTEM_URI, code: allergy.name.toLowerCase().replace(/\s+/g, '-'), display: allergy.name }],
      text: allergy.name,
    },
    patient: { reference: PATIENT_REF, display: '' },
    recordedDate: allergy.addedAt,
  };

  if (allergy.reaction) {
    resource.reaction = [{
      manifestation: [{
        coding: [{ system: SYSTEM_URI, code: 'reaction', display: allergy.reaction }],
        text: allergy.reaction,
      }],
      severity: severityToFHIRReactionSeverity(allergy.severity),
    }];
  }

  if (allergy.source) {
    resource.note = [{ text: 'Source: ' + allergy.source }];
  }

  return resource;
}

export function medicationToFHIR(med: Medication): FHIRMedicationStatement {
  const resource: FHIRMedicationStatement = {
    resourceType: 'MedicationStatement',
    id: med.id,
    status: medStatusToFHIR(med.status),
    medicationCodeableConcept: {
      coding: [{ system: SYSTEM_URI, code: med.name.toLowerCase().replace(/\s+/g, '-'), display: med.name }],
      text: med.name,
    },
    subject: { reference: PATIENT_REF, display: '' },
    dateAsserted: med.addedAt,
  };

  if (med.startDate || med.discontinuedDate) {
    resource.effectivePeriod = {};
    if (med.startDate) resource.effectivePeriod.start = med.startDate;
    if (med.discontinuedDate) resource.effectivePeriod.end = med.discontinuedDate;
  }

  if (med.dosage || med.frequency) {
    resource.dosage = [{
      text: [med.dosage, med.frequency].filter(Boolean).join(' — '),
    }];
  }

  if (med.prescribedBy) {
    resource.informationSource = { reference: '', display: med.prescribedBy };
  }

  return resource;
}

export function conditionToFHIR(condition: MedicalCondition): FHIRCondition {
  const resource: FHIRCondition = {
    resourceType: 'Condition',
    id: condition.id,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
      text: 'Active',
    },
    code: {
      coding: [{ system: SYSTEM_URI, code: condition.name.toLowerCase().replace(/\s+/g, '-'), display: condition.name }],
      text: condition.name,
    },
    subject: { reference: PATIENT_REF, display: '' },
    recordedDate: condition.addedAt,
  };

  if (condition.diagnosedDate) {
    resource.onsetDateTime = condition.diagnosedDate;
  }

  if (condition.notes) {
    resource.note = [{ text: condition.notes }];
  }

  return resource;
}

export function procedureToFHIR(proc: Procedure): FHIRProcedure {
  const resource: FHIRProcedure = {
    resourceType: 'Procedure',
    id: proc.id,
    status: 'completed',
    code: {
      coding: [{ system: SYSTEM_URI, code: proc.name.toLowerCase().replace(/\s+/g, '-'), display: proc.name }],
      text: proc.name,
    },
    subject: { reference: PATIENT_REF, display: '' },
  };

  if (proc.date) {
    resource.performedDateTime = proc.date;
  }

  if (proc.provider) {
    resource.performer = [{ actor: { reference: '', display: proc.provider } }];
  }

  if (proc.notes) {
    resource.note = [{ text: proc.notes }];
  }

  return resource;
}

export function insuranceToFHIR(insurance: InsuranceInfo): FHIRCoverage {
  const resource: FHIRCoverage = {
    resourceType: 'Coverage',
    id: 'local-coverage',
    status: 'active',
    payor: [{ reference: '', display: insurance.provider }],
  };

  if (insurance.memberId) {
    resource.subscriberId = insurance.memberId;
  }

  if (insurance.planType) {
    resource.type = {
      coding: [{ system: SYSTEM_URI, code: insurance.planType.toLowerCase(), display: insurance.planType }],
      text: insurance.planType,
    };
  }

  const classes: FHIRCoverage['class'] = [];
  if (insurance.groupNumber) {
    classes.push({
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-class', code: 'group', display: 'Group' }],
        text: 'Group',
      },
      value: insurance.groupNumber,
    });
  }
  if (insurance.policyNumber) {
    classes.push({
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-class', code: 'plan', display: 'Plan' }],
        text: 'Plan',
      },
      value: insurance.policyNumber,
    });
  }
  if (classes.length > 0) {
    resource.class = classes;
  }

  return resource;
}

export function healthRecordToFHIRBundle(record: HealthRecord): FHIRBundle {
  const entries: FHIRBundle['entry'] = [];

  entries.push({ resource: personalInfoToFHIRPatient(record.personalInfo) });

  record.allergies.forEach((a) => {
    entries.push({ resource: allergyToFHIR(a) });
  });

  record.medications.forEach((m) => {
    entries.push({ resource: medicationToFHIR(m) });
  });

  record.conditions.forEach((c) => {
    entries.push({ resource: conditionToFHIR(c) });
  });

  record.procedures.forEach((p) => {
    entries.push({ resource: procedureToFHIR(p) });
  });

  if (record.insurance.provider) {
    entries.push({ resource: insuranceToFHIR(record.insurance) });
  }

  console.log('[FHIR] Generated bundle with ' + String(entries.length) + ' resources');

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: entries,
    meta: {
      source: 'MyRecordsMyHealth/1.0',
      versionId: '1',
    },
  };
}

export function getFHIRResourceCounts(record: HealthRecord): Record<string, number> {
  return {
    Patient: 1,
    AllergyIntolerance: record.allergies.length,
    MedicationStatement: record.medications.length,
    Condition: record.conditions.length,
    Procedure: record.procedures.length,
    Coverage: record.insurance.provider ? 1 : 0,
  };
}
