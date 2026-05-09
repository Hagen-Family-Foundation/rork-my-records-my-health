import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/ScaledText';
import { Save, FileText } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { formatRelativeTime } from '@/utils/format';

export default function EditNotesScreen() {
  const { record, updateEmergencyNotes } = useHealthRecords();
  const [content, setContent] = useState<string>(record.emergencyNotes.content);
  const copy = usePhraseSet({
    infoTitle: 'Emergency Notes',
    infoText:
      'Add any information that would help a doctor, nurse, or EMT provide better care in an emergency. This could include surgical implants, DNR status, religious considerations, or any condition that affects treatment decisions.',
    placeholder:
      'e.g. Pacemaker implanted 2022. DNR on file. Cochlear implant right ear. Allergic to contrast dye used in CT scans.',
    lastUpdated: 'Last updated: {time}',
    saveButton: 'Save Notes',
  });

  const handleSave = useCallback(() => {
    updateEmergencyNotes({
      content,
      updatedAt: new Date().toISOString(),
    });
    router.back();
  }, [content, updateEmergencyNotes]);

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
        <View style={styles.card}>
          <TextInput
            style={styles.textArea}
            value={content}
            onChangeText={setContent}
            placeholder={copy.placeholder}
            placeholderTextColor={Colors.textTertiary}
            multiline
            textAlignVertical="top"
            testID="notes-input"
          />
        </View>
        {record.emergencyNotes.updatedAt ? (
          <Text style={styles.lastUpdated}>
            {copy.lastUpdated.replace('{time}', formatRelativeTime(record.emergencyNotes.updatedAt))}
          </Text>
        ) : null}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="notes-save">
          <Save color={Colors.white} size={18} />
          <Text style={styles.saveBtnText}>{copy.saveButton}</Text>
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
    gap: 16,
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  textArea: {
    fontSize: 16,
    color: Colors.text,
    padding: 14,
    minHeight: 200,
    lineHeight: 24,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
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
