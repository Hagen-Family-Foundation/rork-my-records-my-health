import { AuditAction, AuditLogEntry } from '@/types/health';

export function createAuditEntry(
  action: AuditAction,
  description: string,
  category: string,
  metadata?: Record<string, string>
): AuditLogEntry {
  return {
    id: generateId(),
    action,
    description,
    category,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatAuditAction(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    record_viewed: 'Record Viewed',
    record_edited: 'Record Edited',
    record_shared: 'Record Shared',
    record_exported: 'Record Exported',
    emergency_access: 'Emergency Access',
    record_imported: 'Record Imported',
    medication_verified: 'Medication Verified',
    emergency_mode_entered: 'Emergency Mode Entered',
    emergency_mode_exited: 'Emergency Mode Exited',
    emergency_text_prepared: 'Emergency Text Prepared',
    document_added: 'Document Added',
    document_removed: 'Document Removed',
  };
  return labels[action];
}

export function getAuditActionIcon(action: AuditAction): string {
  const icons: Record<AuditAction, string> = {
    record_viewed: 'Eye',
    record_edited: 'Pencil',
    record_shared: 'Share2',
    record_exported: 'Download',
    emergency_access: 'ShieldAlert',
    record_imported: 'Upload',
    medication_verified: 'CheckCircle',
    emergency_mode_entered: 'Siren',
    emergency_mode_exited: 'ShieldCheck',
    emergency_text_prepared: 'MessageSquare',
    document_added: 'Camera',
    document_removed: 'Trash2',
  };
  return icons[action];
}
