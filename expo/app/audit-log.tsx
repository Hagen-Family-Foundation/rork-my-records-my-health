import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Eye,
  Pencil,
  Share2,
  Download,
  ShieldAlert,
  Upload,
  CheckCircle,
  Siren,
  ShieldCheck,
  Camera,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useHealthRecords } from '@/providers/HealthRecordsProvider';
import { Text } from '@/components/ScaledText';
import Colors from '@/constants/colors';
import { usePhraseSet, useRuntimeText } from '@/localization/runtime';
import { AuditLogEntry, AuditAction } from '@/types/health';
import { formatDateTime, formatPreciseDateTime } from '@/utils/format';
import { formatAuditAction } from '@/utils/audit';

interface AuditLogCopy {
  emptyTitle: string;
  emptyText: string;
  actionLabel: string;
  sectionLabel: string;
  whatChangedLabel: string;
  dateTimeLabel: string;
  resultLabel: string;
  relatedItemsLabel: string;
  changedFieldsLabel: string;
  notesLabel: string;
  tapToExpand: string;
  tapToCollapse: string;
}

interface AuditDetailRow {
  label: string;
  value: string;
  testID: string;
}

interface AuditItemProps {
  item: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  copy: AuditLogCopy;
}

function getActionIcon(action: AuditAction): React.ReactNode {
  switch (action) {
    case 'record_viewed':
      return <Eye color={Colors.primary} size={16} />;
    case 'record_edited':
      return <Pencil color={Colors.primary} size={16} />;
    case 'record_shared':
      return <Share2 color={Colors.primary} size={16} />;
    case 'record_exported':
      return <Download color={Colors.primary} size={16} />;
    case 'emergency_access':
      return <ShieldAlert color={Colors.emergency} size={16} />;
    case 'record_imported':
      return <Upload color={Colors.primary} size={16} />;
    case 'medication_verified':
      return <CheckCircle color={Colors.verified} size={16} />;
    case 'emergency_mode_entered':
      return <Siren color={Colors.emergency} size={16} />;
    case 'emergency_mode_exited':
      return <ShieldCheck color={Colors.verified} size={16} />;
    case 'document_added':
      return <Camera color={Colors.primary} size={16} />;
    case 'document_removed':
      return <Trash2 color={Colors.emergency} size={16} />;
    case 'emergency_text_prepared':
      return <MessageSquare color={Colors.emergency} size={16} />;
    default:
      return null;
  }
}

function getActionColor(action: AuditAction): string {
  switch (action) {
    case 'emergency_access':
    case 'emergency_mode_entered':
      return Colors.emergencyLight;
    case 'medication_verified':
    case 'emergency_mode_exited':
      return Colors.verifiedLight;
    case 'document_removed':
    case 'emergency_text_prepared':
      return Colors.emergencyLight;
    default:
      return Colors.primaryLight;
  }
}

function AuditItem({ item, isExpanded, onToggle, copy }: AuditItemProps) {
  const translatedDescription = useRuntimeText(item.description);
  const translatedCategory = useRuntimeText(item.category);

  const detailRows = useMemo(() => {
    const metadata = item.metadata ?? {};
    const rows: AuditDetailRow[] = [
      {
        label: copy.actionLabel,
        value: formatAuditAction(item.action),
        testID: 'audit-detail-action-' + item.id,
      },
      {
        label: copy.sectionLabel,
        value: translatedCategory,
        testID: 'audit-detail-section-' + item.id,
      },
      {
        label: copy.whatChangedLabel,
        value: metadata.detail ?? translatedDescription,
        testID: 'audit-detail-change-' + item.id,
      },
      {
        label: copy.dateTimeLabel,
        value: String(formatPreciseDateTime(item.timestamp)),
        testID: 'audit-detail-datetime-' + item.id,
      },
    ];

    if (metadata.result) {
      rows.push({
        label: copy.resultLabel,
        value: metadata.result,
        testID: 'audit-detail-result-' + item.id,
      });
    }

    if (metadata.itemName) {
      rows.push({
        label: copy.relatedItemsLabel,
        value: metadata.itemName,
        testID: 'audit-detail-items-' + item.id,
      });
    }

    if (metadata.changedFields) {
      rows.push({
        label: copy.changedFieldsLabel,
        value: metadata.changedFields,
        testID: 'audit-detail-fields-' + item.id,
      });
    }

    if (metadata.note) {
      rows.push({
        label: copy.notesLabel,
        value: metadata.note,
        testID: 'audit-detail-notes-' + item.id,
      });
    }

    return rows;
  }, [copy, item.action, item.id, item.metadata, item.timestamp, translatedCategory, translatedDescription]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onToggle}
      style={[styles.auditCard, isExpanded ? styles.auditCardExpanded : null]}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      accessibilityLabel={translatedDescription}
      accessibilityHint={isExpanded ? copy.tapToCollapse : copy.tapToExpand}
      testID={'audit-item-' + item.id}
    >
      <View style={styles.auditHeader}>
        <View style={[styles.auditIcon, { backgroundColor: getActionColor(item.action) }]}>
          {getActionIcon(item.action)}
        </View>
        <View style={styles.auditContent}>
          <View style={styles.auditTitleRow}>
            <Text style={styles.auditDescription}>{translatedDescription}</Text>
            {isExpanded ? (
              <ChevronUp color={Colors.textTertiary} size={18} />
            ) : (
              <ChevronDown color={Colors.textTertiary} size={18} />
            )}
          </View>
          <View style={styles.auditMeta}>
            <Text style={styles.auditCategory}>{translatedCategory}</Text>
            <Text style={styles.auditDot}>·</Text>
            <Text style={styles.auditTime}>{String(formatDateTime(item.timestamp))}</Text>
          </View>
        </View>
      </View>

      {isExpanded ? (
        <View style={styles.detailPanel} testID={'audit-expanded-' + item.id}>
          {detailRows.map((row, index) => (
            <View
              key={row.testID}
              style={[
                styles.detailRow,
                index === detailRows.length - 1 ? styles.detailRowLast : null,
              ]}
              testID={row.testID}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const MemoizedAuditItem = React.memo(AuditItem);

export default function AuditLogScreen() {
  const { auditLog } = useHealthRecords();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const copy: AuditLogCopy = usePhraseSet({
    emptyTitle: 'No Activity Yet',
    emptyText: 'All views, edits, shares, and emergency access events will be logged here.',
    actionLabel: 'Action',
    sectionLabel: 'Section',
    whatChangedLabel: 'What changed',
    dateTimeLabel: 'Date and time',
    resultLabel: 'Result',
    relatedItemsLabel: 'Related item',
    changedFieldsLabel: 'Fields changed',
    notesLabel: 'Extra notes',
    tapToExpand: 'Double tap to open full audit details',
    tapToCollapse: 'Double tap to collapse full audit details',
  });

  const handleToggleItem = useCallback((id: string) => {
    setExpandedId((currentValue) => (currentValue === id ? null : id));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AuditLogEntry }) => (
      <MemoizedAuditItem
        item={item}
        isExpanded={expandedId === item.id}
        onToggle={() => handleToggleItem(item.id)}
        copy={copy}
      />
    ),
    [copy, expandedId, handleToggleItem]
  );

  const keyExtractor = useCallback((item: AuditLogEntry) => item.id, []);

  if (auditLog.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Eye color={Colors.textTertiary} size={40} />
        <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
        <Text style={styles.emptyText}>{copy.emptyText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={auditLog}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      extraData={expandedId}
      testID="audit-log-list"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: Colors.background,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  auditCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  auditCardExpanded: {
    borderColor: Colors.primary,
    shadowOpacity: 0.08,
  },
  auditHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  auditIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditContent: {
    flex: 1,
    gap: 4,
  },
  auditTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  auditDescription: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  auditMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  auditCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  auditDot: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  auditTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  detailPanel: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
    gap: 10,
  },
  detailRow: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    fontWeight: '500' as const,
  },
});
