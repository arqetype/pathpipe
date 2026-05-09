import type { Company } from '@repo/db/entities/company';
import {
  RiGlobalLine,
  RiLink,
  RiBuildingLine,
  RiMapPinLine,
  RiImageLine,
} from '@remixicon/react';
import Property from '@repo/ui/components/customs/property';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import InlineSelect from '@repo/ui/components/inline-inputs/inline-select';
import { CompanyIndustry } from '@repo/db/types/company/industry';
import { COMPANY_INDUSTRY_OPTIONS } from '../constants/industry';
import { useEffect, useState } from 'react';

type CompanyDialogPropertiesProps = {
  company: Company;
  pendingLogoFile: File | null;
  onSave: (data: Partial<Company>) => void;
  onLogoSelect: (file: File) => void;
};

export function CompanyDialogProperties({
  company,
  pendingLogoFile,
  onSave,
  onLogoSelect,
}: CompanyDialogPropertiesProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingLogoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingLogoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogoFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onLogoSelect(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <Property icon={<RiImageLine className="size-4" />} label="Logo">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
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

      <Property icon={<RiGlobalLine className="size-4" />} label="Website">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <InlineInput
            value={company.website}
            placeholder="https://…"
            onSave={(v) => onSave({ website: v })}
          />
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiLink className="size-3.5" />
            </a>
          )}
        </div>
      </Property>

      <Property icon={<RiLink className="size-4" />} label="Careers URL">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <InlineInput
            value={company.careersUrl}
            placeholder="https://…"
            onSave={(v) => onSave({ careersUrl: v })}
          />
          {company.careersUrl && (
            <a
              href={company.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiLink className="size-3.5" />
            </a>
          )}
        </div>
      </Property>

      <Property icon={<RiBuildingLine className="size-4" />} label="Industry">
        <InlineSelect
          value={company.industry}
          options={COMPANY_INDUSTRY_OPTIONS}
          placeholder="Select industry"
          onSave={(v) => onSave({ industry: v as CompanyIndustry })}
        />
      </Property>

      <Property icon={<RiMapPinLine className="size-4" />} label="Country">
        <InlineInput
          value={company.country}
          placeholder="Country"
          onSave={(v) => onSave({ country: v })}
        />
      </Property>
    </div>
  );
}
