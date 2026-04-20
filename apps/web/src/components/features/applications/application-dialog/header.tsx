import type { Candidate } from '@repo/db/entities/candidate';
import EditableText from '@repo/ui/components/editable-inputs/editable-text';

type ApplicationDialogHeaderProps = {
  application: Candidate;
  onSave: (data: Partial<Candidate>) => void;
};

export function ApplicationDialogHeader({
  application,
  onSave,
}: ApplicationDialogHeaderProps) {
  return (
    <div className="px-8 pt-8 pb-6 flex items-center gap-5">
      <div className="flex flex-col flex-1 gap-1 min-w-0">
        <div className="flex gap-2">
          <EditableText
            value={application.firstName}
            placeholder="First name"
            onSave={(v) => v && onSave({ firstName: v })}
            className="block text-3xl md:text-3xl font-bold leading-snug"
            inputClassName="text-3xl md:text-3xl font-bold leading-snug"
          />
          <EditableText
            value={application.lastName}
            placeholder="Last name"
            onSave={(v) => v && onSave({ lastName: v })}
            className="block text-3xl md:text-3xl font-bold leading-snug"
            inputClassName="text-3xl md:text-3xl font-bold leading-snug"
          />
        </div>

        {application.contactEmail && (
          <p className="text-lg text-muted-foreground">
            {application.contactEmail}
          </p>
        )}
      </div>
    </div>
  );
}
