'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import type { Company } from '@repo/db/entities/company';
import { CompanyIndustry } from '@repo/db/types/company/industry';
import { Button } from '@repo/ui/components/button';
import { DialogFooter, DialogTitle } from '@repo/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import {
  RiBuildingLine,
  RiDeleteBinLine,
  RiGlobalLine,
  RiImageLine,
  RiLink,
  RiLoader5Line,
  RiMapPinLine,
} from '@remixicon/react';
import { toast } from 'sonner';
import { updateCompanyAction } from '@/actions/company/update';
import { deleteCompanyAction } from '@/actions/company/delete';
import { importCompanyLogoAction } from '@/actions/company/import-logo';
import { CompanyLogo } from '@/components/shared/company-logo';
import EditableText from '@repo/ui/components/editable-inputs/editable-text';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import Property from '@repo/ui/components/customs/property';
import { COMPANY_INDUSTRY_OPTIONS } from '../constants/industry';

type FormValues = {
  name: string;
  website: string;
  careersUrl: string;
  industry: CompanyIndustry | '';
  country: string;
};

type EditCompanyFormProps = {
  company: Company;
  onClose: () => void;
};

export function EditCompanyForm({ company, onClose }: EditCompanyFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const { handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      name: company.name ?? '',
      website: company.website ?? '',
      careersUrl: company.careersUrl ?? '',
      industry: company.industry ?? '',
      country: company.country ?? '',
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setPendingLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      if (pendingLogoFile) {
        const formData = new FormData();
        formData.append('file', pendingLogoFile);
        const logoResult = await importCompanyLogoAction(formData, company.id);
        if (!logoResult.success) {
          toast.error(logoResult.error || 'Logo upload failed.');
          return;
        }
      }

      const result = await updateCompanyAction({
        id: company.id,
        name: data.name || undefined,
        website: data.website || undefined,
        careersUrl: data.careersUrl || undefined,
        industry: (data.industry as CompanyIndustry) || undefined,
        country: data.country || undefined,
      });

      if (!result.success) {
        toast.error('Failed to save changes.');
        return;
      }

      toast.success('Changes saved.');
      onClose();
      router.refresh();
    });
  }

  function handleDelete() {
    const companyId = company.id;
    onClose();
    startTransition(async () => {
      await deleteCompanyAction({ id: companyId });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogTitle className="flex items-center gap-4 mb-4">
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
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <EditableText
                value={field.value}
                placeholder="Company name"
                onSave={(v) => v && field.onChange(v)}
                className="block text-3xl md:text-3xl font-bold leading-snug"
                inputClassName="text-3xl md:text-3xl font-bold leading-snug"
              />
            )}
          />
        </div>
      </DialogTitle>

      <div className="flex flex-col gap-2 mt-2">
        <Property icon={<RiImageLine className="size-4" />} label="Logo">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {logoPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreviewUrl}
                alt="Logo preview"
                className="size-8 rounded object-contain border border-border"
              />
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="px-3 py-1 rounded border border-secondary text-sm">
                {pendingLogoFile ? pendingLogoFile.name : 'Upload'}
              </div>
            </label>
          </div>
        </Property>

        <Controller
          name="website"
          control={control}
          render={({ field }) => (
            <Property
              icon={<RiGlobalLine className="size-4" />}
              label="Website"
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <InlineInput
                  value={field.value}
                  placeholder="https://…"
                  onSave={(v) => field.onChange(v ?? '')}
                />
                {field.value && (
                  <a
                    href={field.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RiLink className="size-3.5" />
                  </a>
                )}
              </div>
            </Property>
          )}
        />

        <Controller
          name="careersUrl"
          control={control}
          render={({ field }) => (
            <Property icon={<RiLink className="size-4" />} label="Careers URL">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <InlineInput
                  value={field.value}
                  placeholder="https://…"
                  onSave={(v) => field.onChange(v ?? '')}
                />
                {field.value && (
                  <a
                    href={field.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RiLink className="size-3.5" />
                  </a>
                )}
              </div>
            </Property>
          )}
        />

        <Controller
          name="industry"
          control={control}
          render={({ field }) => (
            <Property
              icon={<RiBuildingLine className="size-4" />}
              label="Industry"
            >
              <Select
                value={field.value as CompanyIndustry}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
                  <SelectValue placeholder="Select industry">
                    {
                      COMPANY_INDUSTRY_OPTIONS.find(
                        (opt) => opt.value === field.value,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {COMPANY_INDUSTRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Property>
          )}
        />

        <Controller
          name="country"
          control={control}
          render={({ field }) => (
            <Property
              icon={<RiMapPinLine className="size-4" />}
              label="Country"
            >
              <InlineInput
                value={field.value}
                placeholder="Country"
                onSave={(v) => field.onChange(v ?? '')}
              />
            </Property>
          )}
        />
      </div>

      <DialogFooter className="flex-row justify-between sm:justify-between mt-4">
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={isPending}
        >
          <RiDeleteBinLine className="size-4 mr-2" />
          Delete
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <RiLoader5Line className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
