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
import { MedicalCondition } from '@/types/health';
import { generateId } from '@/utils/audit';

export default function EditConditionsScreen() {
  const { record, updateConditions } = useHealthRecords();
  const [conditions, setConditions] = useState<MedicalCondition[]>([...record.conditions]);
  const copy = usePhraseSet({
    conditionLabel: 'Condition {number}',
    conditionNameLabel: 'Condition Name',
    conditionNamePlaceholder: 'e.g. Type 2 Diabetes, Hypertension',
    diagnosedLabel: 'Date Diagnosed',
    diagnosedPlaceholder: 'MM/DD/YYYY or approximate',
    notesLabel: 'Notes',
    notesPlaceholder: 'Additional details',
    addButton: 'Add Condition',
    saveButton: 'Save Conditions',
  });

  const handleSave = useCallback(() => {
    const valid = conditions.filter((condition) => condition.name.trim());
    updateConditions(valid);
    router.back();
  }, [conditions, updateConditions]);

  const addCondition = useCallback(() => {
    const newCondition: MedicalCondition = {
      id: generateId(),
      name: '',
      diagnosedDate: '',
      status: 'current',
      notes: '',
      source: 'user',
      addedAt: new Date().toISOString(),
    };
    setConditions((prev) => [...prev, newCondition]);
  }, []);

  const removeCondition = useCallback((id: string) => {
    setConditions((prev) => prev.filter((condition) => condition.id !== id));
  }, []);

  const updateField = useCallback((id: string, field: keyof MedicalCondition, value: string) => {
    setConditions((prev) => prev.map((condition) => (condition.id === id ? { ...condition, [field]: value } : condition)));
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
        {conditions.map((condition, index) => (
          <View key={condition.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>{copy.conditionLabel.replace('{number}', String(index + 1))}</Text>
              <TouchableOpacity onPress={() => removeCondition(condition.id)}>
                <Trash2 color={Colors.emergency} size={16} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.conditionNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={condition.name}
                onChangeText={(value) => updateField(condition.id, 'name', value)}
                placeholder={copy.conditionNamePlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.diagnosedLabel}</Text>
              <TextInput
                style={styles.input}
                value={condition.diagnosedDate}
                onChangeText={(value) => updateField(condition.id, 'diagnosedDate', value)}
                placeholder={copy.diagnosedPlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.notesLabel}</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={condition.notes}
                onChangeText={(value) => updateField(condition.id, 'notes', value)}
                placeholder={copy.notesPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                multiline
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={addCondition} testID="add-condition">
          <Plus color={Colors.primary} size={18} />
          <Text style={styles.addBtnText}>{copy.addButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="conditions-save">
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
