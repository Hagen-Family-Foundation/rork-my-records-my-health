import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { interpolate } from '@/localization/runtime';
import { HealthRecord, MedicalDocument } from '@/types/health';
import { formatFullName, formatPhoneDisplay, formatRelativeTime } from '@/utils/format';

export type EmergencyCardPrintCopy = {
  noNameSet: string;
  dob: string;
  unknown: string;
  criticalAllergies: string;
  otherAllergies: string;
  medications: string;
  lastVerified: string;
  currentConditions: string;
  emergencyContacts: string;
  criticalDocuments: string;
  notes: string;
  insuranceInformation: string;
  insuranceId: string;
  insurancePolicy: string;
  disclaimer: string;
  printedDate: string;
};

type PrintableMedicalDocument = MedicalDocument & {
  printableUri: string;
};

export type EmergencyCardOutputMethod = 'web_print_window' | 'print_dialog' | 'pdf_share';

export type EmergencyCardPdfFile = {
  uri: string;
  numberOfPages: number;
};

export type PreparedEmergencyCardHtml = {
  html: string;
  printedDate: string;
};

/** Builds wallet-sized emergency card HTML and prepares local document images for printing when needed. */
export async function prepareEmergencyCardHtml({
  record,
  copy,
  translateSeverity,
  printedDate = formatEmergencyCardPrintedDate(new Date()),
}: {
  record: HealthRecord;
  copy: EmergencyCardPrintCopy;
  translateSeverity: (severity: string) => string;
  printedDate?: string;
}): Promise<PreparedEmergencyCardHtml> {
  const printableDocuments = Platform.OS === 'web'
    ? getWebPrintableDocuments(record.documents)
    : await preparePrintableDocuments(record.documents);

  return {
    html: buildEmergencyCardPrintHtml({
      record,
      printableDocuments,
      copy,
      printedDate,
      translateSeverity,
    }),
    printedDate,
  };
}

/** Formats the printed/generated date from the current device locale. */
export function formatEmergencyCardPrintedDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.log('[EmergencyCard] Intl date formatting unavailable:', error);
    return date.toLocaleDateString();
  }
}

export function getEmergencyCardPrintMargins(): Print.PageMargins {
  return {
    top: 18,
    right: 18,
    bottom: 18,
    left: 18,
  };
}

function getEmergencyCardPageOptions(): Pick<Print.PrintOptions, 'width' | 'height' | 'margins' | 'orientation'> {
  return {
    width: 612,
    height: 792,
    margins: getEmergencyCardPrintMargins(),
    orientation: Print.Orientation.portrait,
  };
}

function getEmergencyCardFileOptions(): Pick<Print.FilePrintOptions, 'width' | 'height' | 'margins' | 'textZoom'> {
  return {
    width: 612,
    height: 792,
    margins: getEmergencyCardPrintMargins(),
    textZoom: 100,
  };
}

export async function createEmergencyCardPdfFile({
  html,
  fileName,
}: {
  html: string;
  fileName: string;
}): Promise<EmergencyCardPdfFile> {
  const pdf = await Print.printToFileAsync({
    html,
    ...getEmergencyCardFileOptions(),
  });
  const friendlyUri = await copyPdfToFriendlyFileName(pdf.uri, fileName);
  console.log('[EmergencyCard] PDF prepared:', friendlyUri, 'pages:', pdf.numberOfPages);
  return {
    uri: friendlyUri,
    numberOfPages: pdf.numberOfPages,
  };
}

export async function shareEmergencyCardPdfFile(uri: string, dialogTitle: string): Promise<boolean> {
  const sharingAvailable = await Sharing.isAvailableAsync();
  console.log('[EmergencyCard] PDF sharing availability:', sharingAvailable);

  if (!sharingAvailable) {
    return false;
  }

  await Sharing.shareAsync(uri, {
    UTI: 'com.adobe.pdf',
    mimeType: 'application/pdf',
    dialogTitle,
  });
  return true;
}

export async function shareEmergencyCardPdfFromHtml({
  html,
  dialogTitle,
  fileName,
}: {
  html: string;
  dialogTitle: string;
  fileName: string;
}): Promise<boolean> {
  const pdf = await createEmergencyCardPdfFile({ html, fileName });
  return shareEmergencyCardPdfFile(pdf.uri, dialogTitle);
}

export async function printEmergencyCardHtml({
  html,
  dialogTitle,
  fileName,
}: {
  html: string;
  dialogTitle: string;
  fileName: string;
}): Promise<EmergencyCardOutputMethod> {
  if (Platform.OS === 'web') {
    const opened = openEmergencyCardPrintWindow(html);
    if (!opened) {
      throw new Error('WEB_PRINT_WINDOW_BLOCKED');
    }
    return 'web_print_window';
  }

  if (Platform.OS === 'ios') {
    const shared = await shareEmergencyCardPdfFromHtml({ html, dialogTitle, fileName });
    if (!shared) {
      throw new Error('PDF_SHARING_UNAVAILABLE');
    }
    return 'pdf_share';
  }

  try {
    await Print.printAsync({
      html,
      ...getEmergencyCardPageOptions(),
    });
    return 'print_dialog';
  } catch (printError) {
    console.error('[EmergencyCard] Native print failed, opening PDF share fallback:', printError);
    const shared = await shareEmergencyCardPdfFromHtml({ html, dialogTitle, fileName });
    if (!shared) {
      throw printError;
    }
    return 'pdf_share';
  }
}

export function openEmergencyCardPrintWindow(html: string): boolean {
  if (typeof window === 'undefined') return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
  return true;
}

export function buildEmergencyCardFileName(record: HealthRecord, printedDate: string): string {
  const name = formatFullName(record.personalInfo.firstName, record.personalInfo.lastName) || 'Patient';
  const safeName = sanitizeFileName(name);
  const safeDate = sanitizeFileName(printedDate);
  return 'Emergency-Card-' + safeName + '-' + safeDate + '.pdf';
}

function getWebPrintableDocuments(documents: MedicalDocument[]): PrintableMedicalDocument[] {
  return documents.map((document) => ({ ...document, printableUri: document.fileUri }));
}

async function preparePrintableDocuments(documents: MedicalDocument[]): Promise<PrintableMedicalDocument[]> {
  const printableDocuments = await Promise.all(
    documents.map(async (document) => {
      const fileUri = document.fileUri;

      if (!fileUri || fileUri.startsWith('data:') || fileUri.startsWith('http://') || fileUri.startsWith('https://') || fileUri.startsWith('blob:')) {
        return { ...document, printableUri: fileUri };
      }

      try {
        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        return { ...document, printableUri: 'data:' + getImageMimeType(fileUri) + ';base64,' + base64 };
      } catch (error) {
        console.error('[EmergencyCard] Failed to prepare document image for print:', document.id, error);
        return { ...document, printableUri: fileUri };
      }
    })
  );

  return printableDocuments;
}

async function copyPdfToFriendlyFileName(uri: string, fileName: string): Promise<string> {
  if (!FileSystem.cacheDirectory) {
    return uri;
  }

  const destination = FileSystem.cacheDirectory + sanitizeFileName(fileName);
  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    console.error('[EmergencyCard] Failed to rename PDF for sharing:', error);
    return uri;
  }
}

function getImageMimeType(uri: string): string {
  const lowerUri = uri.toLowerCase();
  if (lowerUri.includes('.png')) return 'image/png';
  if (lowerUri.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function buildEmergencyCardPrintHtml({
  record,
  printableDocuments,
  copy,
  printedDate,
  translateSeverity,
}: {
  record: HealthRecord;
  printableDocuments: PrintableMedicalDocument[];
  copy: EmergencyCardPrintCopy;
  printedDate: string;
  translateSeverity: (severity: string) => string;
}): string {
  const fullName = formatFullName(record.personalInfo.firstName, record.personalInfo.lastName) || copy.noNameSet;
  const criticalAllergies = record.allergies.filter((allergy) => allergy.severity === 'life-threatening' || allergy.severity === 'severe');
  const otherAllergies = record.allergies.filter((allergy) => allergy.severity !== 'life-threatening' && allergy.severity !== 'severe');
  const activeMedications = record.medications.filter((medication) => medication.status !== 'discontinued');
  const addressLines = formatAddressLines(record);
  const printedDateText = interpolate(copy.printedDate, { date: printedDate });

  const headerDetails = [
    record.personalInfo.dateOfBirth ? copy.dob + ': ' + record.personalInfo.dateOfBirth : '',
    record.personalInfo.phone ? 'Phone: ' + formatPhoneDisplay(record.personalInfo.phone) : '',
    ...addressLines,
    record.personalInfo.religiousPreference ? 'Religious preference: ' + record.personalInfo.religiousPreference : '',
  ].filter(Boolean);

  const criticalAllergyItems = criticalAllergies.map((allergy) => {
    return allergy.name + ' (' + translateSeverity(allergy.severity) + ')' + (allergy.reaction ? ' — ' + allergy.reaction : '');
  });
  const otherAllergyItems = otherAllergies.map((allergy) => allergy.name + ' (' + translateSeverity(allergy.severity) + ')');
  const conditionItems = record.conditions.map((condition) => condition.name);
  const contactItems = record.emergencyContacts.map((contact) => {
    return contact.name + ' (' + contact.relationship + ')' + (contact.isPrimary ? ' PRIMARY' : '') + ' — ' + formatPhoneDisplay(contact.phone);
  });

  const primaryContact = record.emergencyContacts.find((contact) => contact.isPrimary) ?? record.emergencyContacts[0];
  const documentItems = printableDocuments.map((document) => document.label || document.type.replace(/_/g, ' '));
  const primaryContactText = primaryContact
    ? primaryContact.name + ' (' + primaryContact.relationship + ') — ' + formatPhoneDisplay(primaryContact.phone)
    : '';
  const compactMedicationItems = activeMedications.map((medication) => {
    const details = [medication.dosage, medication.frequency].filter(Boolean).join(' ');
    return details ? medication.name + ' ' + details : medication.name;
  });
  const compactInsuranceItems = [
    record.insurance.provider,
    record.insurance.memberId ? 'ID ' + record.insurance.memberId : '',
    record.insurance.policyNumber ? 'Policy ' + record.insurance.policyNumber : '',
  ].filter(Boolean);

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    '<title>Wallet Emergency Medical Card</title>' +
    '<style>' +
    '@page{size:letter;margin:.25in;}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}html,body{margin:0;padding:0;background:#fff;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;}' +
    '.sheet{width:8in;min-height:10.5in;padding:.12in;}' +
    '.print-note{font-size:9px;color:#4B5563;margin:0 0 .08in;font-weight:800;}' +
    '.wallet-row{display:flex;gap:.18in;align-items:flex-start;page-break-inside:avoid;break-inside:avoid;}' +
    '.wallet-card{width:3.375in;height:2.125in;border:2px solid #111827;border-radius:.12in;overflow:hidden;background:#fff;position:relative;page-break-inside:avoid;break-inside:avoid;}' +
    '.front{border-color:#DC2626;}.back{border-color:#1E3A5F;}' +
    '.card-header{height:.30in;padding:.035in .09in;color:#fff;background:#DC2626;display:flex;align-items:center;justify-content:space-between;gap:.08in;}' +
    '.back .card-header{background:#1E3A5F;}' +
    '.eyebrow{font-size:8.6px;font-weight:900;letter-spacing:.55px;text-transform:uppercase;line-height:1;}' +
    '.printed{font-size:7.1px;font-weight:800;text-align:right;line-height:1.05;white-space:nowrap;}' +
    '.card-body{padding:.055in .09in .13in;height:1.825in;display:grid;gap:.03in;}' +
    '.front .card-body{grid-template-columns:1fr .68in;grid-template-rows:auto auto 1fr;}' +
    '.identity{grid-column:1 / 3;border-bottom:1px solid #E5E7EB;padding-bottom:.028in;min-width:0;}' +
    'h1{font-size:17.4px;line-height:1;margin:0 0 .02in;font-weight:950;letter-spacing:-.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.details{font-size:8.2px;line-height:1.1;color:#374151;display:flex;flex-wrap:wrap;gap:.018in .06in;}' +
    '.blood{background:#991B1B;color:#fff;border-radius:.07in;display:flex;flex-direction:column;align-items:center;justify-content:center;align-self:start;min-height:.39in;padding:.028in;}' +
    '.blood-label{font-size:7px;font-weight:900;letter-spacing:.45px;opacity:.82;}.blood-value{font-size:18.6px;font-weight:950;line-height:1;}' +
    '.section{min-width:0;overflow:hidden;}' +
    '.section-title{font-size:7.9px;line-height:1;font-weight:950;letter-spacing:.46px;text-transform:uppercase;margin:0 0 .018in;color:#1E3A5F;}' +
    '.critical .section-title{color:#DC2626;}.critical li{font-weight:900;color:#7F1D1D;}' +
    'ul{margin:0;padding-left:.105in;}li{font-size:7.9px;line-height:1.07;margin:0 0 .007in;}' +
    '.front-list{max-height:.64in;overflow:hidden;}.back-grid{height:1.58in;display:grid;grid-template-columns:1fr 1fr;gap:.028in .06in;}' +
    '.wide{grid-column:1 / 3;}.small-text{font-size:7.8px;line-height:1.07;margin:0;color:#111827;white-space:pre-wrap;max-height:.42in;overflow:hidden;}' +
    '.verification{font-size:7.1px;color:#6B7280;margin:0 0 .01in;line-height:1;}.footer-strip{position:absolute;left:.09in;right:.09in;bottom:.045in;border-top:1px solid #E5E7EB;padding-top:.018in;display:flex;justify-content:space-between;gap:.04in;font-size:6.9px;line-height:1;color:#6B7280;font-weight:700;}' +
    '.brand{color:#1E3A5F;font-weight:950;}.cut-guide{width:3.375in;text-align:center;font-size:7px;color:#9CA3AF;margin-top:.035in;}@media print{.print-note{display:none;}.sheet{padding:0;}body{background:#fff;}.wallet-row{page-break-after:avoid;}}' +
    '</style></head><body><main class="sheet">' +
    '<p class="print-note">Recommended printer settings: Color, Best Quality/Best Resolution, 100% scale. Then cut along each wallet-card border. Each panel is 3.375 in × 2.125 in.</p>' +
    '<section class="wallet-row">' +
    '<article class="wallet-card front"><header class="card-header"><div class="eyebrow">Emergency Medical Card</div><div class="printed">' + escapeHtml(printedDateText) + '</div></header>' +
    '<div class="card-body"><section class="identity"><h1>' + escapeHtml(fullName) + '</h1><div class="details">' + renderCompactDetails(headerDetails) + '</div></section>' +
    '<section class="section critical"><h2 class="section-title">' + escapeHtml(copy.criticalAllergies) + '</h2><div class="front-list">' + renderCompactList(criticalAllergyItems, 'None entered') + '</div></section>' +
    '<div class="blood"><div class="blood-label">BLOOD</div><div class="blood-value">' + escapeHtml(record.personalInfo.bloodType || copy.unknown) + '</div></div>' +
    '<section class="section wide"><h2 class="section-title">' + escapeHtml(copy.emergencyContacts) + '</h2>' + renderCompactList(primaryContactText ? [primaryContactText] : contactItems, 'None entered') + '</section></div>' +
    '<div class="footer-strip"><span>' + escapeHtml(copy.disclaimer) + '</span><span class="brand">MyBodyIsMyHealth.com</span></div></article>' +
    '<article class="wallet-card back"><header class="card-header"><div class="eyebrow">Medical Details</div><div class="printed">Keep in wallet</div></header>' +
    '<div class="card-body"><div class="back-grid">' +
    '<section class="section"><h2 class="section-title">' + escapeHtml(copy.medications) + '</h2><p class="verification">' + escapeHtml(interpolate(copy.lastVerified, { time: formatRelativeTime(record.medicationVerification.lastVerifiedAt) })) + '</p>' + renderCompactList(compactMedicationItems, 'None entered') + '</section>' +
    '<section class="section"><h2 class="section-title">' + escapeHtml(copy.currentConditions) + '</h2>' + renderCompactList(conditionItems, 'None entered') + '</section>' +
    '<section class="section"><h2 class="section-title">' + escapeHtml(copy.otherAllergies) + '</h2>' + renderCompactList(otherAllergyItems, 'None entered') + '</section>' +
    '<section class="section"><h2 class="section-title">' + escapeHtml(copy.insuranceInformation) + '</h2>' + renderCompactList(compactInsuranceItems, 'None entered') + '</section>' +
    '<section class="section wide"><h2 class="section-title">' + escapeHtml(copy.notes) + '</h2><p class="small-text">' + escapeHtml(record.emergencyNotes.content || (documentItems.length > 0 ? copy.criticalDocuments + ': ' + documentItems.join(', ') : 'None entered')) + '</p></section>' +
    '</div></div><div class="footer-strip"><span>' + escapeHtml(printedDateText) + '</span><span class="brand">Verify with patient when possible</span></div></article>' +
    '</section><div class="wallet-row"><div class="cut-guide">FRONT</div><div class="cut-guide">BACK</div></div></main></body></html>';
}

function formatAddressLines(record: HealthRecord): string[] {
  const cityLine = [record.personalInfo.city, record.personalInfo.state, record.personalInfo.zipCode].filter(Boolean).join(' ');
  return [record.personalInfo.addressLine1, record.personalInfo.addressLine2, cityLine].filter(Boolean);
}

function renderCompactList(items: string[], fallback: string): string {
  const visibleItems = items.filter((item) => item.trim().length > 0);
  if (visibleItems.length === 0) return '<p class="small-text">' + escapeHtml(fallback) + '</p>';
  return '<ul>' + visibleItems.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>';
}

function renderCompactDetails(lines: string[]): string {
  if (lines.length === 0) return '<span>No additional personal details entered</span>';
  return lines.map((line) => '<span>' + escapeHtml(line) + '</span>').join('');
}

function sanitizeFileName(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return sanitized || 'Emergency-Card.pdf';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
