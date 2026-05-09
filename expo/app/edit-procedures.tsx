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
import { Save, Plus, Trash2 } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { Procedure } from '@/types/health';
import { generateId } from '@/utils/audit';

export default function EditProceduresScreen() {
  const { record, updateProcedures } = useHealthRecords();
  const [procedures, setProcedures] = useState<Procedure[]>([...record.procedures]);
  const copy = usePhraseSet({
    procedureLabel: 'Procedure {number}',
    procedureNameLabel: 'Procedure Name',
    procedureNamePlaceholder: 'e.g. Knee Replacement, Appendectomy',
    dateLabel: 'Date',
    datePlaceholder: 'MM/DD/YYYY or approximate',
    providerLabel: 'Provider / Hospital',
    providerPlaceholder: 'Doctor or hospital name',
    notesLabel: 'Notes',
    notesPlaceholder: 'Additional details',
    addButton: 'Add Procedure',
    saveButton: 'Save Procedures',
  });

  const handleSave = useCallback(() => {
    const valid = procedures.filter((procedure) => procedure.name.trim());
    updateProcedures(valid);
    router.back();
  }, [procedures, updateProcedures]);

  const handleAdd = useCallback(() => {
    const newProcedure: Procedure = {
      id: generateId(),
      name: '',
      date: '',
      provider: '',
      notes: '',
      source: 'user',
      addedAt: new Date().toISOString(),
    };
    setProcedures((prev) => [...prev, newProcedure]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setProcedures((prev) => prev.filter((procedure) => procedure.id !== id));
  }, []);

  const updateField = useCallback((id: string, field: keyof Procedure, value: string) => {
    setProcedures((prev) => prev.map((procedure) => (procedure.id === id ? { ...procedure, [field]: value } : procedure)));
  }, []);

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
        {procedures.map((procedure, index) => (
          <View key={procedure.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>{copy.procedureLabel.replace('{number}', String(index + 1))}</Text>
              <TouchableOpacity onPress={() => handleRemove(procedure.id)}>
                <Trash2 color={Colors.emergency} size={16} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.procedureNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={procedure.name}
                onChangeText={(value) => updateField(procedure.id, 'name', value)}
                placeholder={copy.procedureNamePlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.dateLabel}</Text>
              <TextInput
                style={styles.input}
                value={procedure.date}
                onChangeText={(value) => updateField(procedure.id, 'date', value)}
                placeholder={copy.datePlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.providerLabel}</Text>
              <TextInput
                style={styles.input}
                value={procedure.provider}
                onChangeText={(value) => updateField(procedure.id, 'provider', value)}
                placeholder={copy.providerPlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.notesLabel}</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={procedure.notes}
                onChangeText={(value) => updateField(procedure.id, 'notes', value)}
                placeholder={copy.notesPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                multiline
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} testID="add-procedure">
          <Plus color={Colors.primary} size={18} />
          <Text style={styles.addBtnText}>{copy.addButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="procedures-save">
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
    gap: 14,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
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
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 14,
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
