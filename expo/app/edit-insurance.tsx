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
import { Save } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { InsuranceInfo } from '@/types/health';
import { formatPhoneNumber } from '@/utils/format';

export default function EditInsuranceScreen() {
  const { record, updateInsurance } = useHealthRecords();
  const [insurance, setInsurance] = useState<InsuranceInfo>({ ...record.insurance });
  const copy = usePhraseSet({
    providerLabel: 'Insurance Provider',
    providerPlaceholder: 'e.g. Blue Cross Blue Shield',
    planTypeLabel: 'Plan Type',
    planTypePlaceholder: 'e.g. PPO, HMO, EPO',
    policyNumberLabel: 'Policy Number',
    policyNumberPlaceholder: 'Policy number',
    groupNumberLabel: 'Group Number',
    groupNumberPlaceholder: 'Group number',
    memberIdLabel: 'Member ID',
    memberIdPlaceholder: 'Member ID',
    phoneLabel: 'Insurance Phone',
    phonePlaceholder: '800-555-5555',
    saveButton: 'Save Insurance',
  });

  const handleSave = useCallback(() => {
    updateInsurance(insurance);
    router.back();
  }, [insurance, updateInsurance]);

  const updateField = useCallback((field: keyof InsuranceInfo, value: string) => {
    const formattedValue = field === 'phone' ? formatPhoneNumber(value) : value;
    setInsurance((prev) => ({ ...prev, [field]: formattedValue }));
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
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{copy.providerLabel}</Text>
            <TextInput
              style={styles.input}
              value={insurance.provider}
              onChangeText={(value) => updateField('provider', value)}
              placeholder={copy.providerPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              testID="insurance-provider"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{copy.planTypeLabel}</Text>
            <TextInput
              style={styles.input}
              value={insurance.planType}
              onChangeText={(value) => updateField('planType', value)}
              placeholder={copy.planTypePlaceholder}
              placeholderTextColor={Colors.textTertiary}
              testID="insurance-plan"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{copy.policyNumberLabel}</Text>
            <TextInput
              style={styles.input}
              value={insurance.policyNumber}
              onChangeText={(value) => updateField('policyNumber', value)}
              placeholder={copy.policyNumberPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              testID="insurance-policy"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{copy.groupNumberLabel}</Text>
            <TextInput
              style={styles.input}
              value={insurance.groupNumber}
              onChangeText={(value) => updateField('groupNumber', value)}
              placeholder={copy.groupNumberPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              testID="insurance-group"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{copy.memberIdLabel}</Text>
            <TextInput
              style={styles.input}
              value={insurance.memberId}
              onChangeText={(value) => updateField('memberId', value)}
              placeholder={copy.memberIdPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              testID="insurance-member"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{copy.phoneLabel}</Text>
            <TextInput
              style={styles.input}
              value={insurance.phone}
              onChangeText={(value) => updateField('phone', value)}
              placeholder={copy.phonePlaceholder}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
              testID="insurance-phone"
            />
          </View>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="insurance-save">
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
    gap: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
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
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 14,
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
