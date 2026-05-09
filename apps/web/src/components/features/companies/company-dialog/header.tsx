import type { Company } from '@repo/db/entities/company';
import { CompanyLogo } from '@/components/shared/company-logo';
import EditableText from '@repo/ui/components/editable-inputs/editable-text';
import { DialogHeader } from '@repo/ui/components/dialog';

type CompanyDialogHeaderProps = {
  company: Company;
  onSave: (data: Partial<Company>) => void;
};

export function CompanyDialogHeader({
  company,
  onSave,
}: CompanyDialogHeaderProps) {
  return (
    <DialogHeader className="flex-row items-center gap-4">
      <CompanyLogo
        companyId={company.id}
        name={company.name}
        size={80}
        cacheKey={
          company.updated_at
            ? new Date(company.updated_at).getTime()
            : undefined
        }
        className="size-20 rounded-xl object-contain shrink-0"
      />

      <div className="flex flex-col flex-1 gap-1 min-w-0">
        <EditableText
          value={company.name}
          placeholder="Company name"
          onSave={(v) => v && onSave({ name: v })}
          className="block text-3xl md:text-3xl font-bold leading-snug"
          inputClassName="text-3xl md:text-3xl font-bold leading-snug"
        />
      </div>
    </DialogHeader>
  );
}
