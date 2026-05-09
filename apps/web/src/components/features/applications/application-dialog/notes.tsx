import { RiFileTextLine } from '@remixicon/react';
import type { Application } from '@repo/db/entities/application';
import EditableTextarea from '@repo/ui/components/editable-inputs/editable-textarea';

type ApplicationDialogNotesProps = {
  application: Application;
  onSave: (data: Partial<Application>) => void;
};

export function ApplicationDialogNotes({
  application,
  onSave,
}: ApplicationDialogNotesProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <RiFileTextLine className="size-4" />
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
