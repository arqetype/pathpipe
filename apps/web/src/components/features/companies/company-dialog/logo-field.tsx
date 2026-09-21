'use client';

import { useState } from 'react';
import { RiImageLine } from '@remixicon/react';
import { toast } from 'sonner';
import Property from '@repo/ui/components/customs/property';

const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const MAX_LOGO_SIZE_BYTES = 10 * 1024 * 1024;

export function CompanyLogoField({
  onSelect,
}: {
  onSelect: (file: File) => void;
}) {
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      toast.error('Only PNG, JPEG, WebP, and GIF images are allowed.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error('Logo must be smaller than 10 MB.');
      return;
    }
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setPendingLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    onSelect(file);
  }

  return (
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
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="px-3 py-1 rounded border border-secondary text-sm">
            {pendingLogoFile ? pendingLogoFile.name : 'Upload'}
          </div>
        </label>
      </div>
    </Property>
  );
}
