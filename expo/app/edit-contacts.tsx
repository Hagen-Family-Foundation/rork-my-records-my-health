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
import { Save, Plus, Trash2, Star } from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';
import { EmergencyContact } from '@/types/health';
import { generateId } from '@/utils/audit';
import { formatPhoneNumber } from '@/utils/format';

export default function EditContactsScreen() {
  const { record, updateEmergencyContacts } = useHealthRecords();
  const [contacts, setContacts] = useState<EmergencyContact[]>([...record.emergencyContacts]);
  const copy = usePhraseSet({
    contactLabel: 'Contact {number}',
    primary: 'Primary',
    nameLabel: 'Name',
    namePlaceholder: 'Contact name',
    relationshipLabel: 'Relationship',
    relationshipPlaceholder: 'e.g. Spouse, Parent, Sibling',
    phoneLabel: 'Phone',
    phonePlaceholder: '555-555-5555',
    addButton: 'Add Emergency Contact',
    saveButton: 'Save Contacts',
  });

  const handleSave = useCallback(() => {
    const valid = contacts.filter((contact) => contact.name.trim() && contact.phone.trim());
    if (valid.length > 0 && !valid.some((contact) => contact.isPrimary)) {
      valid[0].isPrimary = true;
    }
    updateEmergencyContacts(valid);
    router.back();
  }, [contacts, updateEmergencyContacts]);

  const addContact = useCallback(() => {
    const newContact: EmergencyContact = {
      id: generateId(),
      name: '',
      relationship: '',
      phone: '',
      isPrimary: contacts.length === 0,
    };
    setContacts((prev) => [...prev, newContact]);
  }, [contacts.length]);

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
  }, []);

  const updateContactField = useCallback((id: string, field: 'name' | 'relationship' | 'phone', value: string) => {
    const formattedValue = field === 'phone' ? formatPhoneNumber(value) : value;
    setContacts((prev) =>
      prev.map((contact) => (contact.id === id ? { ...contact, [field]: formattedValue } : contact))
    );
  }, []);

  const setPrimaryContact = useCallback((id: string) => {
    setContacts((prev) => prev.map((contact) => ({ ...contact, isPrimary: contact.id === id })));
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
        {contacts.map((contact, index) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactLabel}>{copy.contactLabel.replace('{number}', String(index + 1))}</Text>
              <View style={styles.contactActions}>
                <TouchableOpacity
                  style={[styles.primaryBtn, contact.isPrimary ? styles.primaryBtnActive : undefined]}
                  onPress={() => setPrimaryContact(contact.id)}
                >
                  <Star
                    color={contact.isPrimary ? Colors.white : Colors.warning}
                    size={14}
                    fill={contact.isPrimary ? Colors.white : 'transparent'}
                  />
                  <Text style={[styles.primaryText, contact.isPrimary ? styles.primaryTextActive : undefined]}>{copy.primary}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeContact(contact.id)}>
                  <Trash2 color={Colors.emergency} size={16} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.nameLabel}</Text>
              <TextInput
                style={styles.input}
                value={contact.name}
                onChangeText={(value) => updateContactField(contact.id, 'name', value)}
                placeholder={copy.namePlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.relationshipLabel}</Text>
              <TextInput
                style={styles.input}
                value={contact.relationship}
                onChangeText={(value) => updateContactField(contact.id, 'relationship', value)}
                placeholder={copy.relationshipPlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.phoneLabel}</Text>
              <TextInput
                style={styles.input}
                value={contact.phone}
                onChangeText={(value) => updateContactField(contact.id, 'phone', value)}
                placeholder={copy.phonePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={addContact} testID="add-contact">
          <Plus color={Colors.primary} size={18} />
          <Text style={styles.addBtnText}>{copy.addButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="contacts-save">
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
  contactCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  primaryBtnActive: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  primaryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  primaryTextActive: {
    color: Colors.white,
  },
  deleteBtn: {
    padding: 4,
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
