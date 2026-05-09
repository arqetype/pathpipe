import type { Application } from '@repo/db/entities/application';
import { CompanyLogo } from '@/components/shared/company-logo';
import EditableText from '@repo/ui/components/editable-inputs/editable-text';
import { DialogTitle } from '@repo/ui/components/dialog';

type ApplicationDialogHeaderProps = {
  application: Application;
  onSave: (data: Partial<Application>) => void;
};

export function ApplicationDialogHeader({
  application,
  onSave,
}: ApplicationDialogHeaderProps) {
  return (
    <DialogTitle className=" flex items-start gap-5">
      <CompanyLogo
        key={application.company?.id ?? application.id}
        companyId={application.company?.id}
        name={application.company?.name ?? 'Unknown'}
        size={80}
        className="size-20 rounded-xl object-contain shrink-0"
      />

      <div className="flex flex-col flex-1 gap-1 min-w-0">
        <EditableText
          value={application.position}
          placeholder="Position title"
          onSave={(v) => v && onSave({ position: v })}
          className="block text-3xl md:text-3xl font-bold leading-snug"
          inputClassName="text-3xl md:text-3xl font-bold leading-snug"
        />

        <EditableText
          value={application.company?.name ?? ''}
          placeholder="Company name"
          onSave={() => {}}
          className="block text-lg md:text-lg text-muted-foreground"
          inputClassName="text-lg md:text-lg text-muted-foreground"
        />
      </div>
    </DialogTitle>
  );
}
