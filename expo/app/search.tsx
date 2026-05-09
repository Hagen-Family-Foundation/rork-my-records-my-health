import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/ScaledText';
import {
  Search,
  User,
  Phone,
  AlertTriangle,
  Pill,
  Activity,
  Stethoscope,
  Shield,
  FileText,
  Camera,
  ChevronRight,
  X,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { usePhraseSet } from '@/localization/runtime';
import { triggerHaptic } from '@/utils/haptics';

interface SearchResult {
  id: string;
  category: string;
  categoryIcon: React.ReactNode;
  title: string;
  subtitle: string;
  editRoute: string;
  severity?: string;
}

export default function SearchScreen() {
  const { record } = useHealthRecords();
  const [query, setQuery] = useState<string>('');
  const copy = usePhraseSet({
    categoryPersonal: 'Personal Info',
    categoryContacts: 'Emergency Contacts',
    categoryAllergies: 'Allergies',
    categoryMedications: 'Medications',
    categoryConditions: 'Conditions',
    categoryProcedures: 'Procedures',
    categoryInsurance: 'Insurance',
    categoryNotes: 'Emergency Notes',
    categoryDocuments: 'Documents',
    personalFallback: 'Personal Information',
    bloodType: 'Blood Type',
    dob: 'DOB',
    diagnosed: 'Diagnosed',
    currentCondition: 'Current condition',
    noDate: 'No date',
    memberId: 'Member ID',
    notesTitle: 'Emergency Notes',
    discontinuedSuffix: 'discontinued',
    searchPlaceholder: 'Search medications, allergies, conditions...',
    searchAccessibilityLabel: 'Search all health records',
    searchAccessibilityHint: 'Type to search across medications, allergies, conditions, and more',
    clearSearchAccessibility: 'Clear search',
    emptyTitle: 'Search Your Records',
    emptySubtitle: 'Find medications, allergies, conditions, contacts, insurance, and documents — all in one place.',
    noResultsTitle: 'No Results',
    noResultsSubtitle: 'No records match "{query}"',
    resultSingular: '{count} result',
    resultPlural: '{count} results',
    openEditorHint: 'Opens {category} editor',
  });

  const results = useMemo((): SearchResult[] => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    const matches: SearchResult[] = [];
    const fullName = [record.personalInfo.firstName, record.personalInfo.lastName].filter(Boolean).join(' ');

    if (
      fullName.toLowerCase().includes(normalizedQuery) ||
      record.personalInfo.phone.toLowerCase().includes(normalizedQuery) ||
      record.personalInfo.bloodType.toLowerCase().includes(normalizedQuery) ||
      record.personalInfo.dateOfBirth.includes(normalizedQuery)
    ) {
      matches.push({
        id: 'personal',
        category: copy.categoryPersonal,
        categoryIcon: <User color={Colors.primary} size={16} />,
        title: fullName || copy.personalFallback,
        subtitle: [record.personalInfo.bloodType, record.personalInfo.dateOfBirth].filter(Boolean).join(' • '),
        editRoute: '/edit-personal',
      });
    }

    record.emergencyContacts.forEach((contact) => {
      if (
        contact.name.toLowerCase().includes(normalizedQuery) ||
        contact.phone.includes(normalizedQuery) ||
        contact.relationship.toLowerCase().includes(normalizedQuery)
      ) {
        matches.push({
          id: 'contact-' + contact.id,
          category: copy.categoryContacts,
          categoryIcon: <Phone color={Colors.primary} size={16} />,
          title: contact.name,
          subtitle: contact.relationship + ' • ' + contact.phone,
          editRoute: '/edit-contacts',
        });
      }
    });

    record.allergies.forEach((allergy) => {
      if (
        allergy.name.toLowerCase().includes(normalizedQuery) ||
        allergy.reaction.toLowerCase().includes(normalizedQuery)
      ) {
        matches.push({
          id: 'allergy-' + allergy.id,
          category: copy.categoryAllergies,
          categoryIcon: <AlertTriangle color={Colors.emergency} size={16} />,
          title: allergy.name,
          subtitle: allergy.severity.toUpperCase() + (allergy.reaction ? ' — ' + allergy.reaction : ''),
          editRoute: '/edit-allergies',
          severity: allergy.severity,
        });
      }
    });

    record.medications.forEach((medication) => {
      if (
        medication.name.toLowerCase().includes(normalizedQuery) ||
        medication.dosage.toLowerCase().includes(normalizedQuery) ||
        medication.prescribedBy.toLowerCase().includes(normalizedQuery)
      ) {
        matches.push({
          id: 'med-' + medication.id,
          category: copy.categoryMedications,
          categoryIcon: <Pill color={Colors.primary} size={16} />,
          title:
            medication.name +
            (medication.status === 'discontinued' ? ' (' + copy.discontinuedSuffix + ')' : ''),
          subtitle: medication.dosage + ' — ' + medication.frequency,
          editRoute: '/edit-medications',
        });
      }
    });

    record.conditions.forEach((condition) => {
      if (
        condition.name.toLowerCase().includes(normalizedQuery) ||
        condition.notes.toLowerCase().includes(normalizedQuery)
      ) {
        matches.push({
          id: 'cond-' + condition.id,
          category: copy.categoryConditions,
          categoryIcon: <Activity color={Colors.primary} size={16} />,
          title: condition.name,
          subtitle: condition.diagnosedDate
            ? copy.diagnosed + ': ' + condition.diagnosedDate
            : copy.currentCondition,
          editRoute: '/edit-conditions',
        });
      }
    });

    record.procedures.forEach((procedure) => {
      if (
        procedure.name.toLowerCase().includes(normalizedQuery) ||
        procedure.provider.toLowerCase().includes(normalizedQuery)
      ) {
        matches.push({
          id: 'proc-' + procedure.id,
          category: copy.categoryProcedures,
          categoryIcon: <Stethoscope color={Colors.primary} size={16} />,
          title: procedure.name,
          subtitle: (procedure.date || copy.noDate) + (procedure.provider ? ' • ' + procedure.provider : ''),
          editRoute: '/edit-procedures',
        });
      }
    });

    if (
      record.insurance.provider.toLowerCase().includes(normalizedQuery) ||
      record.insurance.memberId.toLowerCase().includes(normalizedQuery) ||
      record.insurance.policyNumber.toLowerCase().includes(normalizedQuery)
    ) {
      matches.push({
        id: 'insurance',
        category: copy.categoryInsurance,
        categoryIcon: <Shield color={Colors.primary} size={16} />,
        title: record.insurance.provider || copy.categoryInsurance,
        subtitle: record.insurance.memberId ? copy.memberId + ': ' + record.insurance.memberId : '',
        editRoute: '/edit-insurance',
      });
    }

    if (record.emergencyNotes.content.toLowerCase().includes(normalizedQuery)) {
      matches.push({
        id: 'notes',
        category: copy.categoryNotes,
        categoryIcon: <FileText color={Colors.primary} size={16} />,
        title: copy.notesTitle,
        subtitle:
          record.emergencyNotes.content.substring(0, 80) +
          (record.emergencyNotes.content.length > 80 ? '...' : ''),
        editRoute: '/edit-notes',
      });
    }

    record.documents.forEach((document) => {
      const label = document.label || document.type.replace(/_/g, ' ');
      if (label.toLowerCase().includes(normalizedQuery) || document.notes.toLowerCase().includes(normalizedQuery)) {
        matches.push({
          id: 'doc-' + document.id,
          category: copy.categoryDocuments,
          categoryIcon: <Camera color={Colors.primary} size={16} />,
          title: label,
          subtitle: document.type.replace(/_/g, ' '),
          editRoute: '/edit-documents',
        });
      }
    });

    return matches;
  }, [copy, query, record]);

  const handleResultPress = useCallback((route: string) => {
    void triggerHaptic('navigate');
    router.push(route as never);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    void triggerHaptic('select');
  }, []);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
    });
    return groups;
  }, [results]);

  const resultCountLabel =
    results.length === 1
      ? copy.resultSingular.replace('{count}', String(results.length))
      : copy.resultPlural.replace('{count}', String(results.length));

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search color={Colors.textTertiary} size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder={copy.searchPlaceholder}
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus={true}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={copy.searchAccessibilityLabel}
          accessibilityHint={copy.searchAccessibilityHint}
          testID="search-input"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            accessibilityLabel={copy.clearSearchAccessibility}
            testID="search-clear"
          >
            <X color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.resultsList}
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {query.length < 2 ? (
          <View style={styles.emptyState}>
            <Search color={Colors.textTertiary} size={40} />
            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.emptySubtitle}>{copy.emptySubtitle}</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{copy.noResultsTitle}</Text>
            <Text style={styles.emptySubtitle}>{copy.noResultsSubtitle.replace('{query}', query)}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>{resultCountLabel}</Text>
            {Object.entries(groupedResults).map(([category, items]) => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
                <View style={styles.card}>
                  {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <TouchableOpacity
                        style={styles.resultItem}
                        onPress={() => handleResultPress(item.editRoute)}
                        accessibilityLabel={item.title + ', ' + item.category}
                        accessibilityHint={copy.openEditorHint.replace('{category}', item.category)}
                        testID={'search-result-' + item.id}
                      >
                        <View style={styles.resultIcon}>{item.categoryIcon}</View>
                        <View style={styles.resultContent}>
                          <Text
                            style={[
                              styles.resultTitle,
                              item.severity === 'life-threatening' || item.severity === 'severe'
                                ? { color: Colors.emergency }
                                : undefined,
                            ]}
                          >
                            {item.title}
                          </Text>
                          {item.subtitle ? (
                            <Text style={styles.resultSubtitle} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <ChevronRight color={Colors.textTertiary} size={16} />
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  resultCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600' as const,
    paddingLeft: 4,
  },
  categoryGroup: {
    gap: 6,
  },
  categoryLabel: {
    fontSize: 11,
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
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    gap: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  resultSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 54,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
