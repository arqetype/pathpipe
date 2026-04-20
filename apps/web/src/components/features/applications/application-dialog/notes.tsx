import type { Candidate } from '@repo/db/entities/candidate';
import { FileText } from 'lucide-react';
import EditableTextarea from '@repo/ui/components/editable-inputs/editable-textarea';

type ApplicationDialogNotesProps = {
  application: Candidate;
  onSave: (data: Partial<Candidate>) => void;
};

export function ApplicationDialogNotes({
  application,
  onSave,
}: ApplicationDialogNotesProps) {
  return (
    <div className="px-8 py-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <FileText className="size-4" />
        <span className="text-sm font-medium">Notes</span>
      </div>
      <EditableTextarea
        value={application.notes}
        placeholder="Add notes, interview details, context…"
        onSave={(v) => onSave({ notes: v })}
      />
    </div>
  );
}
