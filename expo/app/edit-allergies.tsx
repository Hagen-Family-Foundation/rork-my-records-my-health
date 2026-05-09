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
import { Save, Plus, Trash2, AlertTriangle } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { Allergy, SEVERITY_LEVELS } from '@/types/health';
import { generateId } from '@/utils/audit';

type AllergyDraft = Allergy;

export default function EditAllergiesScreen() {
  const { record, updateAllergies } = useHealthRecords();
  const [allergies, setAllergies] = useState<AllergyDraft[]>([...record.allergies]);
  const copy = usePhraseSet({
    infoText: 'Life-threatening and severe allergies are highlighted in Emergency View for immediate visibility.',
    allergyLabel: 'Allergy {number}',
    allergenLabel: 'Allergen',
    allergenPlaceholder: 'e.g. Penicillin, Peanuts, Latex',
    severityLabel: 'Severity',
    severityMild: 'Mild',
    severityModerate: 'Moderate',
    severitySevere: 'Severe',
    severityLifeThreatening: 'Life-threatening',
    reactionLabel: 'Reaction',
    reactionPlaceholder: 'e.g. Anaphylaxis, Hives, Swelling',
    addButton: 'Add Allergy',
    saveButton: 'Save Allergies',
  });

  const handleSave = useCallback(() => {
    const valid = allergies.filter((allergy) => allergy.name.trim());
    updateAllergies(valid);
    router.back();
  }, [allergies, updateAllergies]);

  const addAllergy = useCallback(() => {
    const newAllergy: AllergyDraft = {
      id: generateId(),
      name: '',
      severity: 'moderate',
      reaction: '',
      source: 'user',
      addedAt: new Date().toISOString(),
    };
    setAllergies((prev) => [...prev, newAllergy]);
  }, []);

  const removeAllergy = useCallback((id: string) => {
    setAllergies((prev) => prev.filter((allergy) => allergy.id !== id));
  }, []);

  const updateAllergyField = useCallback((id: string, field: keyof AllergyDraft, value: string) => {
    setAllergies((prev) => prev.map((allergy) => (allergy.id === id ? { ...allergy, [field]: value } : allergy)));
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
        <View style={styles.infoCard}>
          <AlertTriangle color={Colors.warning} size={16} />
          <Text style={styles.infoText}>{copy.infoText}</Text>
        </View>
        {allergies.map((allergy, index) => (
          <View key={allergy.id} style={styles.allergyCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>{copy.allergyLabel.replace('{number}', String(index + 1))}</Text>
              <TouchableOpacity onPress={() => removeAllergy(allergy.id)}>
                <Trash2 color={Colors.emergency} size={16} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.allergenLabel}</Text>
              <TextInput
                style={styles.input}
                value={allergy.name}
                onChangeText={(value) => updateAllergyField(allergy.id, 'name', value)}
                placeholder={copy.allergenPlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.severityLabel}</Text>
              <View style={styles.severityRow}>
                {SEVERITY_LEVELS.map((severity) => {
                  const translatedLabel =
                    severity.value === 'mild'
                      ? copy.severityMild
                      : severity.value === 'moderate'
                        ? copy.severityModerate
                        : severity.value === 'severe'
                          ? copy.severitySevere
                          : copy.severityLifeThreatening;

                  return (
                    <TouchableOpacity
                      key={severity.value}
                      style={[
                        styles.severityChip,
                        allergy.severity === severity.value
                          ? { backgroundColor: severity.color, borderColor: severity.color }
                          : undefined,
                      ]}
                      onPress={() => updateAllergyField(allergy.id, 'severity', severity.value)}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          allergy.severity === severity.value ? styles.severityTextActive : undefined,
                        ]}
                      >
                        {translatedLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.reactionLabel}</Text>
              <TextInput
                style={styles.input}
                value={allergy.reaction}
                onChangeText={(value) => updateAllergyField(allergy.id, 'reaction', value)}
                placeholder={copy.reactionPlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={addAllergy} testID="add-allergy">
          <Plus color={Colors.primary} size={18} />
          <Text style={styles.addBtnText}>{copy.addButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="allergies-save">
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500' as const,
    lineHeight: 17,
  },
  allergyCard: {
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
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  severityChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  severityTextActive: {
    color: Colors.white,
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
