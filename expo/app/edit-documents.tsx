import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/ScaledText';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as Linking from 'expo-linking';
import { Camera, ImageIcon, Trash2, FileText, Save, FileUp, FileType, Eye, Share2, Mail, X } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { useSecurity } from '@/providers/SecurityProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { MedicalDocument, DOCUMENT_TYPES, DocumentType } from '@/types/health';
import { generateId } from '@/utils/audit';

export default function EditDocumentsScreen() {
  const { record, updateDocuments, logShare } = useHealthRecords();
  const { settings } = useSecurity();
  const [documents, setDocuments] = useState<MedicalDocument[]>([...record.documents]);
  const [previewDocument, setPreviewDocument] = useState<MedicalDocument | null>(null);
  const [emailDocument, setEmailDocument] = useState<MedicalDocument | null>(null);
  const [doctorEmail, setDoctorEmail] = useState<string>('');
  const copy = usePhraseSet({
    permissionRequiredTitle: 'Permission Required',
    cameraPermissionMessage: 'Camera access is needed to take photos of documents.',
    galleryPermissionMessage: 'Photo library access is needed to select document photos.',
    errorTitle: 'Error',
    imagePickError: 'Failed to capture image. Please try again.',
    removeTitle: 'Remove Document',
    removeMessage: 'Are you sure you want to remove this document?',
    cancelButton: 'Cancel',
    removeButton: 'Remove',
    addTitle: 'Add Document',
    addMessage: 'Choose how to add a document photo',
    takePhotoButton: 'Take Photo',
    chooseGalleryButton: 'Choose from Gallery',
    infoTitle: 'Critical Documents',
    infoText:
      "Photograph your DNR orders, organ donor cards, driver's license, or other critical medical documents — or import PDFs and files (e.g. records saved from email) so you can share them with another doctor later. These will be available in Emergency View for first responders.",
    chooseFileButton: 'Import File (PDF, etc.)',
    chooseFileHint: 'Pick from Files — including medical records you saved from email',
    filePickError: 'Failed to import file. Please try again.',
    pdfPreviewLabel: 'PDF document',
    fileSizeLabel: '{size}',
    documentLabel: 'Document {number}',
    documentTypeLabel: 'Document Type',
    labelLabel: 'Label',
    notesLabel: 'Notes',
    notesPlaceholder: 'Optional notes about this document',
    addButton: 'Take Photo',
    chooseGalleryAltButton: 'Choose from Gallery',
    saveButton: 'Save Documents',
    defaultDocumentLabel: 'Document',
    documentActionsTitle: 'Document Options',
    documentActionsMessage: 'Choose what you want to do with this saved medical file.',
    viewDocumentButton: 'View Document',
    shareDocumentButton: 'Share File',
    emailDocumentButton: 'Email to Doctor',
    closeButton: 'Close',
    privacyReminderTitle: 'Before Sharing This File',
    privacyReminderMessage:
      'This is an actual medical document file. It will leave the private app storage only after you choose where to send it. Please confirm the recipient or app is correct before sending.',
    continueButton: 'Continue',
    shareUnavailableTitle: 'Sharing Not Available',
    shareUnavailableMessage: 'This device cannot share local files right now. Try again from the mobile app or save the document from your Files app.',
    openFailedMessage: 'Could not open this document. You can still try sharing it with another app.',
    emailTitle: 'Email Medical Document',
    emailSubtitle: 'Enter the doctor’s email, or leave it blank and fill it in after the draft opens.',
    doctorEmailPlaceholder: 'doctor@example.com',
    openEmailDraftButton: 'Open Email Draft',
    chooseEmailAppButton: 'Choose Email App',
    emailSubject: 'Medical document from MyRecordsMyHealth',
    emailBody:
      'Attached is a medical document I saved in MyRecordsMyHealth. Please review it and add it to my medical history as appropriate. This information is user-provided and should be verified with me or my caregiver.',
    emailUnavailableMessage: 'No email composer is available on this device. Use Choose Email App to send the file through your phone’s share options.',
    emailFailedMessage: 'Could not prepare the email draft. Please try the share option instead.',
    tapDocumentHint: 'Tap the document preview to view, share, or email the file.',
  });

  const copyToLocalStorage = useCallback(async (uri: string, extension: string): Promise<string> => {
    if (Platform.OS === 'web') {
      return uri;
    }

    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return uri;
      const fileName = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + extension;
      const destinationUri = docDir + fileName;
      await FileSystem.copyAsync({ from: uri, to: destinationUri });
      console.log('[Documents] Copied file to:', destinationUri);
      return destinationUri;
    } catch (error) {
      console.error('[Documents] Failed to copy file:', error);
      return uri;
    }
  }, []);

  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(copy.permissionRequiredTitle, copy.cameraPermissionMessage);
          return null;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(copy.permissionRequiredTitle, copy.galleryPermissionMessage);
          return null;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        return await copyToLocalStorage(result.assets[0].uri, 'jpg');
      }

      return null;
    } catch (error) {
      console.error('[Documents] Image pick error:', error);
      Alert.alert(copy.errorTitle, copy.imagePickError);
      return null;
    }
  }, [copy.cameraPermissionMessage, copy.errorTitle, copy.galleryPermissionMessage, copy.imagePickError, copy.permissionRequiredTitle, copyToLocalStorage]);

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }
      const asset = result.assets[0];
      const inferredExt = (asset.name?.split('.').pop() ?? 'pdf').toLowerCase();
      const safeExt = inferredExt.length > 0 && inferredExt.length <= 5 ? inferredExt : 'pdf';
      const localUri = await copyToLocalStorage(asset.uri, safeExt);
      return {
        uri: localUri,
        fileName: asset.name ?? '',
        mimeType: asset.mimeType ?? (safeExt === 'pdf' ? 'application/pdf' : ''),
        fileSize: asset.size ?? 0,
      };
    } catch (error) {
      console.error('[Documents] File pick error:', error);
      Alert.alert(copy.errorTitle, copy.filePickError);
      return null;
    }
  }, [copy.errorTitle, copy.filePickError, copyToLocalStorage]);

  const handleAddDocument = useCallback(async (source: 'camera' | 'gallery') => {
    const uri = await pickImage(source);
    if (!uri) return;

    const newDocument: MedicalDocument = {
      id: generateId(),
      type: 'other',
      label: '',
      fileUri: uri,
      notes: '',
      addedAt: new Date().toISOString(),
      source: 'user',
      mimeType: 'image/jpeg',
    };

    setDocuments((prev) => [...prev, newDocument]);
  }, [pickImage]);

  const handleAddFile = useCallback(async () => {
    const file = await pickFile();
    if (!file) return;

    const defaultLabel = file.fileName ? file.fileName.replace(/\.[^.]+$/, '') : '';
    const newDocument: MedicalDocument = {
      id: generateId(),
      type: 'other',
      label: defaultLabel,
      fileUri: file.uri,
      notes: '',
      addedAt: new Date().toISOString(),
      source: 'user',
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };

    setDocuments((prev) => [...prev, newDocument]);
  }, [pickFile]);

  const confirmFileShareIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!settings.documentShareReminderEnabled) {
      return true;
    }

    return await new Promise<boolean>((resolve) => {
      Alert.alert(copy.privacyReminderTitle, copy.privacyReminderMessage, [
        { text: copy.cancelButton, style: 'cancel', onPress: () => resolve(false) },
        { text: copy.continueButton, onPress: () => resolve(true) },
      ]);
    });
  }, [copy.cancelButton, copy.continueButton, copy.privacyReminderMessage, copy.privacyReminderTitle, settings.documentShareReminderEnabled]);

  const openDocumentExternally = useCallback(async (document: MedicalDocument) => {
    if (isImageDocument(document)) {
      setPreviewDocument(document);
      return;
    }

    try {
      const openUri = Platform.OS === 'android'
        ? await FileSystem.getContentUriAsync(document.fileUri)
        : document.fileUri;
      const supported = await Linking.canOpenURL(openUri);
      if (supported) {
        await Linking.openURL(openUri);
        return;
      }

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(document.fileUri, {
          dialogTitle: copy.viewDocumentButton,
          mimeType: document.mimeType || undefined,
          UTI: getAppleUti(document),
        });
        return;
      }

      Alert.alert(copy.errorTitle, copy.openFailedMessage);
    } catch (error) {
      console.error('[Documents] Open document failed:', error);
      Alert.alert(copy.errorTitle, copy.openFailedMessage);
    }
  }, [copy.errorTitle, copy.openFailedMessage, copy.viewDocumentButton]);

  const shareDocumentFile = useCallback(async (document: MedicalDocument, method: 'share' | 'email-app' = 'share') => {
    const confirmed = await confirmFileShareIfNeeded();
    if (!confirmed) return;

    try {
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert(copy.shareUnavailableTitle, copy.shareUnavailableMessage);
        return;
      }

      await Sharing.shareAsync(document.fileUri, {
        dialogTitle: method === 'email-app' ? copy.emailDocumentButton : copy.shareDocumentButton,
        mimeType: document.mimeType || undefined,
        UTI: getAppleUti(document),
      });
      logShare(method === 'email-app' ? 'email app share sheet' : 'system share sheet', 'shared one saved medical document file');
    } catch (error) {
      console.error('[Documents] Share document failed:', error);
      Alert.alert(copy.errorTitle, copy.shareUnavailableMessage);
    }
  }, [confirmFileShareIfNeeded, copy.emailDocumentButton, copy.errorTitle, copy.shareDocumentButton, copy.shareUnavailableMessage, copy.shareUnavailableTitle, logShare]);

  const openEmailModal = useCallback((document: MedicalDocument) => {
    setDoctorEmail('');
    setEmailDocument(document);
  }, []);

  const sendDocumentEmail = useCallback(async () => {
    if (!emailDocument) return;

    const confirmed = await confirmFileShareIfNeeded();
    if (!confirmed) return;

    try {
      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        Alert.alert(copy.shareUnavailableTitle, copy.emailUnavailableMessage);
        return;
      }

      const recipient = doctorEmail.trim();
      await MailComposer.composeAsync({
        recipients: recipient ? [recipient] : [],
        subject: copy.emailSubject,
        body: copy.emailBody,
        attachments: [emailDocument.fileUri],
      });
      setEmailDocument(null);
      setDoctorEmail('');
      logShare(recipient || 'email composer', 'emailed one saved medical document file attachment');
    } catch (error) {
      console.error('[Documents] Email document failed:', error);
      Alert.alert(copy.errorTitle, copy.emailFailedMessage);
    }
  }, [confirmFileShareIfNeeded, copy.emailBody, copy.emailFailedMessage, copy.emailSubject, copy.emailUnavailableMessage, copy.errorTitle, copy.shareUnavailableTitle, doctorEmail, emailDocument, logShare]);

  const handleDocumentPress = useCallback((document: MedicalDocument) => {
    Alert.alert(copy.documentActionsTitle, copy.documentActionsMessage, [
      {
        text: copy.viewDocumentButton,
        onPress: () => {
          void openDocumentExternally(document);
        },
      },
      {
        text: copy.shareDocumentButton,
        onPress: () => {
          void shareDocumentFile(document, 'share');
        },
      },
      {
        text: copy.emailDocumentButton,
        onPress: () => openEmailModal(document),
      },
      { text: copy.cancelButton, style: 'cancel' },
    ]);
  }, [copy.cancelButton, copy.documentActionsMessage, copy.documentActionsTitle, copy.emailDocumentButton, copy.shareDocumentButton, copy.viewDocumentButton, openDocumentExternally, openEmailModal, shareDocumentFile]);

  const handleRemoveDocument = useCallback((id: string) => {
    Alert.alert(copy.removeTitle, copy.removeMessage, [
      { text: copy.cancelButton, style: 'cancel' },
      {
        text: copy.removeButton,
        style: 'destructive',
        onPress: () => setDocuments((prev) => prev.filter((document) => document.id !== id)),
      },
    ]);
  }, [copy.cancelButton, copy.removeButton, copy.removeMessage, copy.removeTitle]);

  const updateDocumentField = useCallback((id: string, field: keyof MedicalDocument, value: string) => {
    setDocuments((prev) => prev.map((document) => (document.id === id ? { ...document, [field]: value } : document)));
  }, []);

  const handleSave = useCallback(() => {
    const validDocuments = documents.filter((document) => document.fileUri);
    const labeledDocuments = validDocuments.map((document) => ({
      ...document,
      label: document.label.trim() || getDocTypeLabel(document.type, copy.defaultDocumentLabel),
    }));
    updateDocuments(labeledDocuments);
    console.log('[EditDocuments] Saved documents:', labeledDocuments.length);
    router.back();
  }, [copy.defaultDocumentLabel, documents, updateDocuments]);

  const openCameraDirectly = useCallback(() => {
    if (Platform.OS === 'web') {
      void handleAddDocument('gallery');
      return;
    }
    void handleAddDocument('camera');
  }, [handleAddDocument]);

  const openGalleryDirectly = useCallback(() => {
    void handleAddDocument('gallery');
  }, [handleAddDocument]);

  const openFilePickerDirectly = useCallback(() => {
    void handleAddFile();
  }, [handleAddFile]);

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
        <View style={styles.infoCard}>
          <FileText color={Colors.primary} size={18} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{copy.infoTitle}</Text>
            <Text style={styles.infoText}>{copy.infoText}</Text>
          </View>
        </View>
        {documents.map((document, index) => (
          <View key={document.id} style={styles.docCard}>
            <View style={styles.docHeader}>
              <Text style={styles.docLabel}>{copy.documentLabel.replace('{number}', String(index + 1))}</Text>
              <TouchableOpacity onPress={() => handleRemoveDocument(document.id)} testID={String('remove-doc-' + document.id)}>
                <Trash2 color={Colors.emergency} size={16} />
              </TouchableOpacity>
            </View>
            {document.fileUri ? (
              isImageDocument(document) ? (
                <TouchableOpacity
                  style={styles.thumbnailContainer}
                  onPress={() => handleDocumentPress(document)}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityHint={copy.tapDocumentHint}
                  testID={'document-actions-' + document.id}
                >
                  <Image source={{ uri: document.fileUri }} style={styles.thumbnail} contentFit="cover" />
                  <View style={styles.documentActionPill}>
                    <Eye color={Colors.white} size={13} />
                    <Text style={styles.documentActionPillText}>{copy.viewDocumentButton}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.fileThumbnail}
                  onPress={() => handleDocumentPress(document)}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityHint={copy.tapDocumentHint}
                  testID={'document-actions-' + document.id}
                >
                  <FileType color={Colors.primary} size={28} />
                  <View style={styles.fileThumbnailContent}>
                    <Text style={styles.fileThumbnailTitle} numberOfLines={1}>
                      {document.fileName || copy.pdfPreviewLabel}
                    </Text>
                    <Text style={styles.fileThumbnailSize}>
                      {[getDocumentKindLabel(document), document.fileSize ? formatBytes(document.fileSize) : ''].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                  <Share2 color={Colors.primary} size={18} />
                </TouchableOpacity>
              )
            ) : null}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.documentTypeLabel}</Text>
              <View style={styles.typeRow}>
                {DOCUMENT_TYPES.map((documentType) => (
                  <TouchableOpacity
                    key={documentType.value}
                    style={[styles.typeChip, document.type === documentType.value ? styles.typeChipActive : undefined]}
                    onPress={() => updateDocumentField(document.id, 'type', documentType.value)}
                  >
                    <Text style={[styles.typeChipText, document.type === documentType.value ? styles.typeChipTextActive : undefined]}>
                      {String(documentType.label)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.labelLabel}</Text>
              <TextInput
                style={styles.input}
                value={document.label}
                onChangeText={(value) => updateDocumentField(document.id, 'label', value)}
                placeholder={getDocTypeLabel(document.type, copy.defaultDocumentLabel)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.notesLabel}</Text>
              <TextInput
                style={styles.input}
                value={document.notes}
                onChangeText={(value) => updateDocumentField(document.id, 'notes', value)}
                placeholder={copy.notesPlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={openCameraDirectly} testID="add-document">
          <View style={styles.addBtnContent}>
            <Camera color={Colors.white} size={22} />
            <Text style={styles.addBtnTextPrimary}>{copy.addButton}</Text>
          </View>
        </TouchableOpacity>
        {Platform.OS !== 'web' ? (
          <TouchableOpacity style={styles.galleryBtn} onPress={openGalleryDirectly} testID="add-document-gallery">
            <ImageIcon color={Colors.primary} size={18} />
            <Text style={styles.galleryBtnText}>{copy.chooseGalleryAltButton}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.fileBtn} onPress={openFilePickerDirectly} testID="add-document-file">
          <FileUp color={Colors.primary} size={18} />
          <View style={styles.fileBtnContent}>
            <Text style={styles.fileBtnText}>{copy.chooseFileButton}</Text>
            <Text style={styles.fileBtnHint}>{copy.chooseFileHint}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="documents-save">
          <Save color={Colors.white} size={18} />
          <Text style={styles.saveBtnText}>{copy.saveButton}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={previewDocument !== null} animationType="slide" onRequestClose={() => setPreviewDocument(null)}>
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleWrap}>
              <Text style={styles.previewTitle}>{previewDocument?.label || previewDocument?.fileName || copy.defaultDocumentLabel}</Text>
              <Text style={styles.previewSubtitle}>{copy.tapDocumentHint}</Text>
            </View>
            <TouchableOpacity style={styles.previewCloseButton} onPress={() => setPreviewDocument(null)} accessibilityRole="button">
              <X color={Colors.text} size={20} />
            </TouchableOpacity>
          </View>
          {previewDocument ? (
            <Image source={{ uri: previewDocument.fileUri }} style={styles.previewImage} contentFit="contain" />
          ) : null}
          {previewDocument ? (
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewPrimaryAction} onPress={() => void shareDocumentFile(previewDocument, 'share')}>
                <Share2 color={Colors.white} size={17} />
                <Text style={styles.previewPrimaryActionText}>{copy.shareDocumentButton}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.previewSecondaryAction} onPress={() => openEmailModal(previewDocument)}>
                <Mail color={Colors.primary} size={17} />
                <Text style={styles.previewSecondaryActionText}>{copy.emailDocumentButton}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
      <Modal visible={emailDocument !== null} animationType="fade" transparent={true} onRequestClose={() => setEmailDocument(null)}>
        <View style={styles.emailModalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.emailModalKeyboardWrap}>
            <View style={styles.emailModalCard}>
              <View style={styles.emailModalHeader}>
                <View style={styles.emailIconCircle}>
                  <Mail color={Colors.primary} size={20} />
                </View>
                <View style={styles.emailModalTitleWrap}>
                  <Text style={styles.emailModalTitle}>{copy.emailTitle}</Text>
                  <Text style={styles.emailModalSubtitle}>{copy.emailSubtitle}</Text>
                </View>
              </View>
              <TextInput
                style={styles.emailInput}
                value={doctorEmail}
                onChangeText={setDoctorEmail}
                placeholder={copy.doctorEmailPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity style={styles.emailPrimaryButton} onPress={() => void sendDocumentEmail()}>
                <Mail color={Colors.white} size={17} />
                <Text style={styles.emailPrimaryButtonText}>{copy.openEmailDraftButton}</Text>
              </TouchableOpacity>
              {emailDocument ? (
                <TouchableOpacity style={styles.emailSecondaryButton} onPress={() => void shareDocumentFile(emailDocument, 'email-app')}>
                  <Share2 color={Colors.primary} size={17} />
                  <Text style={styles.emailSecondaryButtonText}>{copy.chooseEmailAppButton}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.emailCancelButton} onPress={() => setEmailDocument(null)}>
                <Text style={styles.emailCancelButtonText}>{copy.cancelButton}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function getDocTypeLabel(type: DocumentType, fallbackLabel: string): string {
  const found = DOCUMENT_TYPES.find((documentType) => documentType.value === type);
  return found?.label ?? fallbackLabel;
}

function isImageDocument(document: MedicalDocument): boolean {
  if (document.mimeType && document.mimeType.startsWith('image/')) return true;
  if (document.mimeType) return false;
  const lower = (document.fileName ?? document.fileUri ?? '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/.test(lower) || (!document.fileName && !lower.endsWith('.pdf'));
}

function getDocumentKindLabel(document: MedicalDocument): string {
  const mimeType = document.mimeType?.toLowerCase() ?? '';
  if (mimeType.includes('pdf') || document.fileName?.toLowerCase().endsWith('.pdf')) return 'PDF';
  if (mimeType.includes('word') || /\.(doc|docx)$/i.test(document.fileName ?? '')) return 'Word file';
  if (mimeType.startsWith('text/')) return 'Text file';
  if (mimeType.startsWith('image/')) return 'Image';
  return 'File';
}

function getAppleUti(document: MedicalDocument): string | undefined {
  const mimeType = document.mimeType?.toLowerCase() ?? '';
  const fileName = document.fileName?.toLowerCase() ?? '';
  if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) return 'com.adobe.pdf';
  if (mimeType.startsWith('image/') || isImageDocument(document)) return 'public.image';
  if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) return 'public.plain-text';
  if (fileName.endsWith('.doc')) return 'com.microsoft.word.doc';
  if (fileName.endsWith('.docx')) return 'org.openxmlformats.wordprocessingml.document';
  return undefined;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value = value / 1024;
    unitIndex += 1;
  }
  const display = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return display + ' ' + units[unitIndex];
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
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 19,
  },
  docCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  docLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  thumbnailContainer: {
    margin: 14,
    marginBottom: 0,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  documentActionPill: {
    position: 'absolute' as const,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 38, 64, 0.86)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  documentActionPillText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800' as const,
  },
  inputGroup: {
    padding: 14,
    gap: 6,
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  typeChipTextActive: {
    color: Colors.white,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
  },
  addBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addBtnTextPrimary: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
  },
  galleryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
  },
  fileBtnContent: {
    flex: 1,
    gap: 2,
  },
  fileBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  fileBtnHint: {
    fontSize: 12,
    color: '#1E40AF',
  },
  fileThumbnail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 14,
    marginBottom: 0,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  fileThumbnailContent: {
    flex: 1,
    gap: 2,
  },
  fileThumbnailTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  fileThumbnailSize: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  previewContainer: {
    flex: 1,
    backgroundColor: '#071827',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 58 : 24,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  previewTitleWrap: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  previewSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  previewCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FFFFFF',
  },
  previewPrimaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  previewPrimaryActionText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  previewSecondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  previewSecondaryActionText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  emailModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 39, 0.62)',
    justifyContent: 'center',
    padding: 18,
  },
  emailModalKeyboardWrap: {
    width: '100%',
  },
  emailModalCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  emailModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  emailIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailModalTitleWrap: {
    flex: 1,
    gap: 3,
  },
  emailModalTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  emailModalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  emailPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  emailPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  emailSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 14,
  },
  emailSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  emailCancelButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  emailCancelButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
});
