import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
  AppState,
} from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/ScaledText';
import {
  ScanLine,
  Pill,
  CheckCircle,
  X,
  AlertTriangle,
  FileText,
  Camera as CameraIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { interpolate, usePhraseSet } from '@/localization/runtime';

interface ScannedMedication {
  name: string;
  dosage: string;
  frequency: string;
}

export default function ScannerScreen() {
  const { addMedication, addDocument, logAction } = useHealthRecords();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [parsedMed, setParsedMed] = useState<ScannedMedication | null>(null);
  const [manualEntry, setManualEntry] = useState<boolean>(false);
  const [medName, setMedName] = useState<string>('');
  const [medDosage, setMedDosage] = useState<string>('');
  const [medFrequency, setMedFrequency] = useState<string>('');
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'looking' | 'found' | 'notfound'>('idle');
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [labelPhotoUri, setLabelPhotoUri] = useState<string>('');
  const cameraRef = useRef<any>(null);

  const checkCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const cameraModule = require('expo-camera');
      const Camera = cameraModule.Camera ?? cameraModule.CameraView;
      const get = Camera?.getCameraPermissionsAsync ?? cameraModule.getCameraPermissionsAsync;
      if (!get) return false;
      const result = await get();
      const granted = !!result?.granted || result?.status === 'granted';
      setCameraPermission(granted ? 'granted' : 'denied');
      setCanAskAgain(result?.canAskAgain !== false);
      console.log('[Scanner] Camera permission (get):', result);
      return granted;
    } catch (err) {
      console.log('[Scanner] getCameraPermissions error:', err);
      return false;
    }
  }, []);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const cameraModule = require('expo-camera');
      const Camera = cameraModule.Camera ?? cameraModule.CameraView;
      const get = Camera?.getCameraPermissionsAsync ?? cameraModule.getCameraPermissionsAsync;
      const req = Camera?.requestCameraPermissionsAsync ?? cameraModule.requestCameraPermissionsAsync;
      if (get) {
        const current = await get();
        const alreadyGranted = !!current?.granted || current?.status === 'granted';
        if (alreadyGranted) {
          setCameraPermission('granted');
          setCanAskAgain(true);
          console.log('[Scanner] Already granted (get):', current);
          return true;
        }
      }
      if (!req) {
        console.log('[Scanner] No permission function found on expo-camera');
        setCameraPermission('denied');
        return false;
      }
      const result = await req();
      const granted = !!result?.granted || result?.status === 'granted';
      setCameraPermission(granted ? 'granted' : 'denied');
      setCanAskAgain(result?.canAskAgain !== false);
      console.log('[Scanner] Camera permission (req):', result);
      return granted;
    } catch (err) {
      console.log('[Scanner] Camera permission error:', err);
      setCameraPermission('denied');
      return false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    checkCameraPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        console.log('[Scanner] App became active, re-checking camera permission');
        checkCameraPermission();
      }
    });
    return () => sub.remove();
  }, [checkCameraPermission]);

  const openAppSettings = useCallback(() => {
    if (Platform.OS === 'web') return;
    Linking.openSettings().catch((err) => {
      console.log('[Scanner] openSettings failed:', err);
    });
  }, []);
  const copy = usePhraseSet({
    nameRequiredTitle: 'Name Required',
    nameRequiredMessage: 'Please enter a medication name.',
    medicationAddedTitle: 'Medication Added',
    medicationAddedMessage: '{name} has been added to your medications.',
    scannerUnavailableTitle: 'Scanner Not Available',
    scannerUnavailableMessage:
      'Barcode scanning requires a native device with a camera. Please use the app on your phone to scan barcodes and QR codes.',
    permissionDeniedTitle: 'Camera Access Needed',
    permissionDeniedMessage:
      'Camera access is required to scan barcodes. Please enable camera access for this app in your device Settings.',
    permissionDeniedInline: 'Camera access was denied. Tap Open Settings below and enable Camera access for MyRecordsMyHealth, then return here and tap Try Again.',
    tryAgain: 'Try Again',
    openSettings: 'Open Settings',
    webFallbackTitle: 'Scanner Not Available',
    webFallbackText: 'Barcode and QR code scanning requires a native device camera. Please use this feature on your phone.',
    addMedicationManually: 'Add Medication Manually',
    startTitle: 'Scan Barcode or QR Code',
    startDescription: "Scan medication barcodes or QR codes from your doctor to quickly add medications to your records.",
    startInfoOne: 'Medication bottle barcodes',
    startInfoTwo: "QR codes from doctor's offices",
    startInfoThree: 'All scanned data requires your approval before saving',
    openScanner: 'Open Scanner',
    orAddManually: 'Or add medication manually',
    cameraUnavailableTitle: 'Camera Not Available',
    cameraUnavailableText: 'Unable to access the camera on this device.',
    alignHint: 'Align barcode or QR code within the frame',
    cancel: 'Cancel',
    scannedBanner: 'Barcode scanned successfully',
    lookingUp: 'Looking up medication in drug database...',
    lookupFound: 'Medication identified from drug database',
    lookupNotFound: "This code couldn't be identified — that's a labeling limitation on the pharmacy's end, not your phone. Pharmacy barcodes often encode internal numbers that aren't in any public database.\n\nBest next step: snap a clear photo of the bottle label (make sure the drug name, strength, and instructions are readable) and then type the details into the fields below. The photo is saved with this medication for your records, but the typed fields are what your doctors and emergency responders will see — so please enter them manually.",
    addLabelPhoto: 'Add Photo of Bottle Label',
    replaceLabelPhoto: 'Retake Label Photo',
    labelPhotoSaved: 'Label photo attached',
    labelPhotoHint: 'Make sure the drug name, strength, and directions are clearly readable.',
    reviewScannedTitle: 'Review Scanned Data',
    addMedicationTitle: 'Add Medication',
    reviewScannedSubtitle: 'Please review and edit before saving to your records.',
    addMedicationSubtitle: 'Enter the medication details below.',
    rawScanData: 'RAW SCAN DATA',
    medicationNameLabel: 'Medication Name',
    medicationNamePlaceholder: 'e.g. Lisinopril, Metformin',
    dosageLabel: 'Dosage',
    dosagePlaceholder: 'e.g. 10mg',
    frequencyLabel: 'Frequency',
    frequencyPlaceholder: 'e.g. Once daily',
    disclaimer:
      'Scanned data must be reviewed and approved by you before being saved. Always verify medication information with your doctor or pharmacist.',
    approveSave: 'Approve & Save',
    scanAgain: 'Scan Again',
  });

  const lookupNdc = useCallback(async (raw: string): Promise<ScannedMedication | null> => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length < 10 || digits.length > 14) return null;

    const candidates: string[] = [];
    if (digits.length === 11) {
      candidates.push(`${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`);
      candidates.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`);
    }
    if (digits.length === 10) {
      candidates.push(`${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`);
      candidates.push(`${digits.slice(0, 5)}-${digits.slice(5, 8)}-${digits.slice(8)}`);
      candidates.push(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
    }
    if (digits.length === 12 || digits.length === 13 || digits.length === 14) {
      const trimmed = digits.slice(-11);
      candidates.push(`${trimmed.slice(0, 5)}-${trimmed.slice(5, 9)}-${trimmed.slice(9)}`);
    }

    for (const ndc of candidates) {
      try {
        const url = `https://api.fda.gov/drug/ndc.json?search=product_ndc:%22${encodeURIComponent(ndc)}%22&limit=1`;
        console.log('[Scanner] openFDA lookup:', url);
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = (await res.json()) as { results?: Array<{ brand_name?: string; generic_name?: string; active_ingredients?: Array<{ name?: string; strength?: string }>; dosage_form?: string }> };
        const hit = json.results && json.results[0];
        if (hit) {
          const name = hit.brand_name || hit.generic_name || (hit.active_ingredients && hit.active_ingredients[0]?.name) || '';
          const strength = (hit.active_ingredients && hit.active_ingredients[0]?.strength) || '';
          return {
            name: String(name).trim(),
            dosage: String(strength).trim(),
            frequency: '',
          };
        }
      } catch (err) {
        console.log('[Scanner] openFDA lookup failed for', ndc, err);
      }
    }
    return null;
  }, []);

  const handleBarcodeScan = useCallback(
    async (result: { type: string; data: string }) => {
      if (scannedData) return;
      setScannerActive(false);
      setScannedData(result.data);
      console.log('[Scanner] Scanned barcode:', result.type, result.data);

      const parsed = parseBarcodeData(result.data);
      let lookupMatch: ScannedMedication | null = null;
      if (parsed) {
        setParsedMed(parsed);
        setMedName(parsed.name);
        setMedDosage(parsed.dosage);
        setMedFrequency(parsed.frequency);
        setLookupStatus('found');
      } else {
        setLookupStatus('looking');
        lookupMatch = await lookupNdc(result.data);
        if (lookupMatch && lookupMatch.name) {
          setParsedMed(lookupMatch);
          setMedName(lookupMatch.name);
          setMedDosage(lookupMatch.dosage);
          setMedFrequency(lookupMatch.frequency);
          setLookupStatus('found');
        } else {
          setMedName('');
          setMedDosage('');
          setMedFrequency('');
          setManualEntry(true);
          setLookupStatus('notfound');
        }
      }

      logAction(
        'record_imported',
        'Barcode/QR scanned: ' + result.type,
        'Scanner',
        {
          detail: 'Scanned a ' + result.type + ' code while adding a prescription.',
          result: parsed || lookupMatch ? 'Scan data detected' : 'Scan could not be matched automatically',
          note: parsed || lookupMatch ? 'Review the imported fields before saving.' : 'Manual entry was suggested because the label format was not recognized.',
        }
      );
    },
    [logAction, lookupNdc, scannedData]
  );

  const parseBarcodeData = (data: string): ScannedMedication | null => {
    const trimmed = data.trim();

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed.medication || parsed.name || parsed.drug) {
        return {
          name: String(parsed.medication ?? parsed.name ?? parsed.drug ?? ''),
          dosage: String(parsed.dosage ?? parsed.strength ?? ''),
          frequency: String(parsed.frequency ?? parsed.sig ?? ''),
        };
      }
    } catch {
      // not JSON
    }

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        const params = url.searchParams;
        const name = params.get('medication') || params.get('drug') || params.get('name') || params.get('rx');
        if (name) {
          return {
            name: String(name).trim(),
            dosage: String(params.get('dosage') || params.get('strength') || '').trim(),
            frequency: String(params.get('frequency') || params.get('sig') || '').trim(),
          };
        }
      } catch {
        // bad URL, fall through
      }
      return null;
    }

    if (/[=:]/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) {
      const pairs: Record<string, string> = {};
      trimmed.split(/[;&\n]+/).forEach((chunk) => {
        const m = chunk.match(/^\s*([a-zA-Z][a-zA-Z0-9_ ]*?)\s*[:=]\s*(.+?)\s*$/);
        if (m) pairs[m[1].toLowerCase().replace(/\s+/g, '')] = m[2];
      });
      const name = pairs.medication || pairs.drug || pairs.name || pairs.rx;
      if (name) {
        return {
          name,
          dosage: pairs.dosage || pairs.strength || '',
          frequency: pairs.frequency || pairs.sig || '',
        };
      }
    }

    const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2 && /[a-zA-Z]/.test(lines[0])) {
      return {
        name: lines[0],
        dosage: lines[1] || '',
        frequency: lines[2] || '',
      };
    }

    return null;
  };

  const handleSaveMedication = useCallback(() => {
    if (!medName.trim()) {
      Alert.alert(copy.nameRequiredTitle, copy.nameRequiredMessage);
      return;
    }

    addMedication({
      name: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFrequency.trim(),
      prescribedBy: '',
      startDate: '',
      source: 'barcode_scan',
      status: 'active',
      discontinuedDate: '',
      labelPhotoUri: labelPhotoUri || undefined,
    });

    if (labelPhotoUri) {
      const docLabel = 'Prescription: ' + medName.trim() + (medDosage.trim() ? ' ' + medDosage.trim() : '');
      addDocument({
        type: 'other',
        label: docLabel,
        fileUri: labelPhotoUri,
        notes: medFrequency.trim(),
        source: 'prescription_label',
      });
      console.log('[Scanner] Also saved label photo as document:', docLabel);
    }

    logAction(
      'record_imported',
      'Medication added via scan: ' + medName.trim(),
      'Scanner',
      {
        detail:
          'Saved scanned prescription ' +
          medName.trim() +
          (medDosage.trim() ? ' with dosage ' + medDosage.trim() : '') +
          (medFrequency.trim() ? ' and frequency ' + medFrequency.trim() : '') +
          '.',
        itemName: medName.trim(),
        result: 'Prescription saved to medications',
        note: labelPhotoUri ? 'Bottle label photo was also saved to documents.' : 'No label photo was attached.',
      }
    );
    Alert.alert(copy.medicationAddedTitle, interpolate(copy.medicationAddedMessage, { name: medName.trim() }));
    router.back();
  }, [
    addDocument,
    addMedication,
    copy.medicationAddedMessage,
    copy.medicationAddedTitle,
    copy.nameRequiredMessage,
    copy.nameRequiredTitle,
    labelPhotoUri,
    logAction,
    medDosage,
    medFrequency,
    medName,
  ]);

  const captureLabelPhoto = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          allowsEditing: true,
        });
        if (!result.canceled && result.assets[0]) {
          setLabelPhotoUri(result.assets[0].uri);
        }
        return;
      }
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(copy.permissionDeniedTitle, copy.permissionDeniedMessage);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const src = result.assets[0].uri;
      try {
        const docDir = FileSystem.documentDirectory;
        if (docDir) {
          const fileName = 'rx_label_' + Date.now() + '.jpg';
          const dest = docDir + fileName;
          await FileSystem.copyAsync({ from: src, to: dest });
          setLabelPhotoUri(dest);
          return;
        }
      } catch (err) {
        console.log('[Scanner] Label photo copy failed:', err);
      }
      setLabelPhotoUri(src);
    } catch (err) {
      console.error('[Scanner] Label photo error:', err);
    }
  }, [copy.permissionDeniedMessage, copy.permissionDeniedTitle]);

  const handleReset = useCallback(() => {
    setScannedData(null);
    setParsedMed(null);
    setManualEntry(false);
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setLabelPhotoUri('');
    setLookupStatus('idle');
    setScannerActive(true);
  }, []);

  const startScanner = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert(copy.scannerUnavailableTitle, copy.scannerUnavailableMessage);
      return;
    }
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert(copy.permissionDeniedTitle, copy.permissionDeniedMessage);
      return;
    }
    setScannerActive(true);
  }, [copy.permissionDeniedMessage, copy.permissionDeniedTitle, copy.scannerUnavailableMessage, copy.scannerUnavailableTitle, requestCameraPermission]);

  const renderScannerView = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webFallback}>
          <ScanLine color={Colors.textTertiary} size={48} />
          <Text style={styles.webFallbackTitle}>{copy.webFallbackTitle}</Text>
          <Text style={styles.webFallbackText}>{copy.webFallbackText}</Text>
          <TouchableOpacity style={styles.manualBtn} onPress={() => setManualEntry(true)} testID="manual-entry-btn">
            <Pill color={Colors.primary} size={16} />
            <Text style={styles.manualBtnText}>{copy.addMedicationManually}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!scannerActive && !scannedData) {
      return (
        <View style={styles.startState}>
          <View style={styles.scanIconCircle}>
            <ScanLine color={Colors.primary} size={48} />
          </View>
          <Text style={styles.startTitle}>{copy.startTitle}</Text>
          <Text style={styles.startDescription}>{copy.startDescription}</Text>
          <View style={styles.startInfoCard}>
            <View style={styles.startInfoRow}>
              <Pill color={Colors.primary} size={16} />
              <Text style={styles.startInfoText}>{copy.startInfoOne}</Text>
            </View>
            <View style={styles.startInfoRow}>
              <FileText color={Colors.primary} size={16} />
              <Text style={styles.startInfoText}>{copy.startInfoTwo}</Text>
            </View>
            <View style={styles.startInfoRow}>
              <AlertTriangle color={Colors.warning} size={16} />
              <Text style={styles.startInfoText}>{copy.startInfoThree}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={startScanner} testID="start-scanner">
            <ScanLine color={Colors.white} size={20} />
            <Text style={styles.scanBtnText}>{copy.openScanner}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualAltBtn} onPress={() => setManualEntry(true)} testID="manual-entry-alt">
            <Text style={styles.manualAltBtnText}>{copy.orAddManually}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (scannerActive) {
      if (cameraPermission === 'denied') {
        return (
          <View style={styles.webFallback}>
            <AlertTriangle color={Colors.warning} size={40} />
            <Text style={styles.webFallbackTitle}>{copy.permissionDeniedTitle}</Text>
            <Text style={styles.webFallbackText}>{copy.permissionDeniedInline}</Text>
            <TouchableOpacity style={styles.manualBtn} onPress={openAppSettings} testID="open-settings">
              <Text style={styles.manualBtnText}>{copy.openSettings}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.manualBtn, styles.manualBtnSecondary]} onPress={startScanner} testID="retry-permission">
              <Text style={[styles.manualBtnText, styles.manualBtnSecondaryText]}>{copy.tryAgain}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualAltBtn} onPress={() => setScannerActive(false)}>
              <Text style={styles.manualAltBtnText}>{copy.cancel}</Text>
            </TouchableOpacity>
          </View>
        );
      }

      let CameraView: React.ComponentType<any> | null = null;
      try {
        const cameraModule = require('expo-camera');
        CameraView = cameraModule.CameraView;
      } catch (err) {
        console.log('[Scanner] expo-camera not available', err);
      }

      if (!CameraView) {
        return (
          <View style={styles.webFallback}>
            <Text style={styles.webFallbackTitle}>{copy.cameraUnavailableTitle}</Text>
            <Text style={styles.webFallbackText}>{copy.cameraUnavailableText}</Text>
            <TouchableOpacity style={styles.manualAltBtn} onPress={() => setScannerActive(false)}>
              <Text style={styles.manualAltBtnText}>{copy.cancel}</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onCameraReady={() => console.log('[Scanner] Camera ready')}
            onMountError={(e: unknown) => {
              console.log('[Scanner] Camera mount error:', e);
              setScannerActive(false);
              Alert.alert(copy.cameraUnavailableTitle, copy.cameraUnavailableText);
            }}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={handleBarcodeScan}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
            <Text style={styles.scanHint}>{copy.alignHint}</Text>
          </View>
          <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setScannerActive(false)} testID="cancel-scan">
            <X color={Colors.white} size={20} />
            <Text style={styles.cancelScanText}>{copy.cancel}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (scannedData || manualEntry) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.reviewContent} keyboardShouldPersistTaps="handled">
          {scannedData ? (
            <View style={styles.scannedBanner}>
              <CheckCircle color={Colors.verified} size={18} />
              <Text style={styles.scannedBannerText}>
                {lookupStatus === 'found' ? copy.lookupFound : copy.scannedBanner}
              </Text>
            </View>
          ) : null}

          {lookupStatus === 'looking' ? (
            <View style={styles.lookupBanner}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.lookupBannerText}>{copy.lookingUp}</Text>
            </View>
          ) : null}

          {lookupStatus === 'notfound' && scannedData ? (
            <View style={styles.notFoundBanner}>
              <AlertTriangle color={Colors.warning} size={16} />
              <Text style={styles.notFoundBannerText}>{copy.lookupNotFound}</Text>
            </View>
          ) : null}

          <View style={styles.labelPhotoCard}>
            {labelPhotoUri ? (
              <View style={styles.labelPhotoPreview}>
                <Image source={{ uri: labelPhotoUri }} style={styles.labelPhotoImage} contentFit="cover" />
                <View style={styles.labelPhotoSavedRow}>
                  <CheckCircle color={Colors.verified} size={14} />
                  <Text style={styles.labelPhotoSavedText}>{copy.labelPhotoSaved}</Text>
                </View>
              </View>
            ) : null}
            <TouchableOpacity style={styles.labelPhotoBtn} onPress={captureLabelPhoto} testID="capture-label-photo">
              <CameraIcon color={Colors.primary} size={16} />
              <Text style={styles.labelPhotoBtnText}>
                {labelPhotoUri ? copy.replaceLabelPhoto : copy.addLabelPhoto}
              </Text>
            </TouchableOpacity>
            <Text style={styles.labelPhotoHint}>{copy.labelPhotoHint}</Text>
          </View>

          <Text style={styles.reviewTitle}>{scannedData ? copy.reviewScannedTitle : copy.addMedicationTitle}</Text>
          <Text style={styles.reviewSubtitle}>{scannedData ? copy.reviewScannedSubtitle : copy.addMedicationSubtitle}</Text>

          {scannedData ? (
            <View style={styles.rawDataCard}>
              <Text style={styles.rawDataLabel}>{copy.rawScanData}</Text>
              <Text style={styles.rawDataText}>{String(scannedData)}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{copy.medicationNameLabel}</Text>
              <TextInput
                style={styles.formInput}
                value={medName}
                onChangeText={setMedName}
                placeholder={copy.medicationNamePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="scan-med-name"
              />
            </View>
            <View style={styles.formDivider} />
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{copy.dosageLabel}</Text>
              <TextInput
                style={styles.formInput}
                value={medDosage}
                onChangeText={setMedDosage}
                placeholder={copy.dosagePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="scan-med-dosage"
              />
            </View>
            <View style={styles.formDivider} />
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{copy.frequencyLabel}</Text>
              <TextInput
                style={styles.formInput}
                value={medFrequency}
                onChangeText={setMedFrequency}
                placeholder={copy.frequencyPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="scan-med-frequency"
              />
            </View>
          </View>

          <View style={styles.disclaimerNote}>
            <AlertTriangle color={Colors.warning} size={14} />
            <Text style={styles.disclaimerNoteText}>{copy.disclaimer}</Text>
          </View>

          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.saveScannedBtn} onPress={handleSaveMedication} testID="save-scanned-med">
              <CheckCircle color={Colors.white} size={18} />
              <Text style={styles.saveScannedText}>{copy.approveSave}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.discardBtn}
              onPress={scannedData ? handleReset : () => router.back()}
              testID="discard-scanned"
            >
              <Text style={styles.discardBtnText}>{scannedData ? copy.scanAgain : copy.cancel}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return <View style={styles.container}>{renderScannerView()}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  webFallbackTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  webFallbackText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 12,
  },
  manualBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  manualBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 8,
  },
  manualBtnSecondaryText: {
    color: Colors.primary,
  },
  startState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  scanIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  startTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  startInfoCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
    width: '100%',
  },
  startInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  startInfoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
  },
  scanBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  manualAltBtn: {
    paddingVertical: 8,
  },
  manualAltBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: 'relative' as const,
  },
  scanCorner: {
    position: 'absolute' as const,
    width: 30,
    height: 30,
    borderColor: Colors.white,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanHint: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cancelScanBtn: {
    position: 'absolute' as const,
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelScanText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  reviewContent: {
    padding: 16,
    gap: 16,
  },
  scannedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.verifiedLight,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
    borderRadius: 12,
    padding: 12,
  },
  scannedBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.verified,
  },
  lookupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 12,
  },
  lookupBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  notFoundBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 12,
  },
  notFoundBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  reviewSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -8,
  },
  rawDataCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 4,
  },
  rawDataLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  rawDataText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  formGroup: {
    padding: 14,
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  formInput: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 2,
  },
  formDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 14,
  },
  disclaimerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 12,
  },
  disclaimerNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  labelPhotoCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 10,
  },
  labelPhotoPreview: {
    gap: 6,
  },
  labelPhotoImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  labelPhotoSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelPhotoSavedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.verified,
  },
  labelPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
  },
  labelPhotoBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  labelPhotoHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    textAlign: 'center',
  },
  reviewActions: {
    gap: 10,
  },
  saveScannedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.verified,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveScannedText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  discardBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  discardBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
