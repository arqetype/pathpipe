import type { Application } from '@repo/db/entities/application';
import { FileText } from 'lucide-react';
import EditableTextarea from '@repo/ui/components/editable-inputs/editable-textarea';

type ApplicationDialogNotesProps = {
  app: Application;
  onSave: (data: Partial<Application>) => void;
};

export function ApplicationDialogNotes({
  app,
  onSave,
}: ApplicationDialogNotesProps) {
  return (
    <div className="px-8 py-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <FileText className="size-4" />
        <span className="text-sm font-medium">Notes</span>
      </div>
      <EditableTextarea
        value={app.notes}
        placeholder="Add notes, interview details, context…"
        onSave={(v) => onSave({ notes: v })}
      />
    </div>
  );
}
