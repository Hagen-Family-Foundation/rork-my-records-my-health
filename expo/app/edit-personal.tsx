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
import { Save, Droplets } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { PersonalInfo, BLOOD_TYPES } from '@/types/health';
import { formatPhoneNumber } from '@/utils/format';

export default function EditPersonalScreen() {
  const { record, updatePersonalInfo } = useHealthRecords();
  const [info, setInfo] = useState<PersonalInfo>({ ...record.personalInfo });
  const copy = usePhraseSet({
    sectionName: 'NAME',
    firstNameLabel: 'First Name',
    firstNamePlaceholder: 'First name',
    lastNameLabel: 'Last Name',
    lastNamePlaceholder: 'Last name',
    sectionDob: 'DATE OF BIRTH',
    dobPlaceholder: 'MM/DD/YYYY',
    sectionBloodType: 'BLOOD TYPE',
    sectionReligion: 'RELIGIOUS PREFERENCE',
    religionPlaceholder: 'e.g. Catholic, Jewish, Muslim, None',
    sectionPhone: 'PHONE',
    phonePlaceholder: '555-555-5555',
    sectionAddress: 'ADDRESS',
    address1Label: 'Address Line 1',
    address1Placeholder: 'Street address',
    address2Label: 'Address Line 2',
    address2Placeholder: 'Apt, suite, etc.',
    cityLabel: 'City',
    cityPlaceholder: 'City',
    stateLabel: 'State',
    statePlaceholder: 'State',
    zipLabel: 'ZIP Code',
    zipPlaceholder: 'ZIP',
    saveButton: 'Save Changes',
  });

  const handleSave = useCallback(() => {
    updatePersonalInfo(info);
    router.back();
  }, [info, updatePersonalInfo]);

  const updateField = useCallback((field: keyof PersonalInfo, value: string) => {
    const formattedValue = field === 'phone' ? formatPhoneNumber(value) : value;
    setInfo((prev) => ({ ...prev, [field]: formattedValue }));
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sectionName}</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.firstNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={info.firstName}
                onChangeText={(value) => updateField('firstName', value)}
                placeholder={copy.firstNamePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="personal-first-name"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.lastNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={info.lastName}
                onChangeText={(value) => updateField('lastName', value)}
                placeholder={copy.lastNamePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="personal-last-name"
              />
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sectionDob}</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={info.dateOfBirth}
                onChangeText={(value) => updateField('dateOfBirth', value)}
                placeholder={copy.dobPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="personal-dob"
              />
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sectionBloodType}</Text>
          <View style={styles.bloodTypeGrid}>
            {BLOOD_TYPES.map((bloodType) => (
              <TouchableOpacity
                key={bloodType}
                style={[
                  styles.bloodTypeChip,
                  info.bloodType === bloodType ? styles.bloodTypeChipActive : undefined,
                ]}
                onPress={() => updateField('bloodType', bloodType)}
                testID={String('blood-type-' + bloodType)}
              >
                <Droplets
                  color={info.bloodType === bloodType ? Colors.white : Colors.emergency}
                  size={14}
                />
                <Text
                  style={[
                    styles.bloodTypeText,
                    info.bloodType === bloodType ? styles.bloodTypeTextActive : undefined,
                  ]}
                >
                  {String(bloodType)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sectionReligion}</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={info.religiousPreference}
                onChangeText={(value) => updateField('religiousPreference', value)}
                placeholder={copy.religionPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="personal-religion"
              />
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sectionPhone}</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={info.phone}
                onChangeText={(value) => updateField('phone', value)}
                placeholder={copy.phonePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                testID="personal-phone"
              />
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sectionAddress}</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.address1Label}</Text>
              <TextInput
                style={styles.input}
                value={info.addressLine1}
                onChangeText={(value) => updateField('addressLine1', value)}
                placeholder={copy.address1Placeholder}
                placeholderTextColor={Colors.textTertiary}
                testID="personal-address1"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.address2Label}</Text>
              <TextInput
                style={styles.input}
                value={info.addressLine2}
                onChangeText={(value) => updateField('addressLine2', value)}
                placeholder={copy.address2Placeholder}
                placeholderTextColor={Colors.textTertiary}
                testID="personal-address2"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.cityLabel}</Text>
              <TextInput
                style={styles.input}
                value={info.city}
                onChangeText={(value) => updateField('city', value)}
                placeholder={copy.cityPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                testID="personal-city"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{copy.stateLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={info.state}
                  onChangeText={(value) => updateField('state', value)}
                  placeholder={copy.statePlaceholder}
                  placeholderTextColor={Colors.textTertiary}
                  testID="personal-state"
                />
              </View>
              <View style={styles.verticalDivider} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{copy.zipLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={info.zipCode}
                  onChangeText={(value) => updateField('zipCode', value)}
                  placeholder={copy.zipPlaceholder}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  testID="personal-zip"
                />
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="personal-save">
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1,
    paddingLeft: 4,
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
  row: {
    flexDirection: 'row',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: Colors.divider,
  },
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bloodTypeChipActive: {
    backgroundColor: Colors.emergency,
    borderColor: Colors.emergency,
  },
  bloodTypeText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  bloodTypeTextActive: {
    color: Colors.white,
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
