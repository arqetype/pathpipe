'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';
import { Field, FieldLabel } from '@repo/ui/components/field';
import { RiCloseLine, RiPencilLine } from '@remixicon/react';
import { CompanyLogo } from '@/components/shared/company-logo';
import { COMPANY_INDUSTRY_OPTIONS } from '@/components/features/companies/constants/industry';
import { WatchedCompany } from '@repo/db/query/company';
import { unwatchCompanyAction } from '@/actions/company/unwatch';
import { updateWatchAction } from '@/actions/company/update-watch';

export function WatchlistCard({ company }: { company: WatchedCompany }) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [careersUrl, setCareersUrl] = useState(company.careersUrl ?? '');
  const [website, setWebsite] = useState(company.website ?? '');
  const [notes, setNotes] = useState(company.notes ?? '');

  function handleUnwatch() {
    startTransition(async () => {
      const result = await unwatchCompanyAction(company.id);
      if (!result.success) {
        toast.error('Failed to remove company from watchlist.');
      }
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateWatchAction(company.id, {
        careersUrl: careersUrl.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      });
      if (result.success) {
        setIsEditing(false);
      } else {
        toast.error('Failed to save your changes.');
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <CompanyLogo
          companyId={company.id}
          name={company.name}
          size={40}
          className="size-10 rounded-lg"
        />
        <CardTitle className="text-base line-clamp-1 flex-1">
          {company.name}
        </CardTitle>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsEditing((v) => !v)}
          aria-label="Edit your notes for this company"
        >
          <RiPencilLine className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={isPending}
          onClick={handleUnwatch}
          aria-label="Remove from watchlist"
        >
          <RiCloseLine className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        {company.industry && (
          <span>
            {COMPANY_INDUSTRY_OPTIONS.find((o) => o.value === company.industry)
              ?.label ?? company.industry}
          </span>
        )}
        {company.country && <span>{company.country}</span>}
        <Badge variant="secondary" className="w-fit">
          {company.applicationsCount} application
          {company.applicationsCount === 1 ? '' : 's'}
        </Badge>

        {isEditing ? (
          <div className="grid gap-2 pt-2">
            <Field>
              <FieldLabel htmlFor={`careers-${company.id}`}>
                Careers URL
              </FieldLabel>
              <Input
                id={`careers-${company.id}`}
                value={careersUrl}
                onChange={(e) => setCareersUrl(e.target.value)}
                placeholder="https://company.com/careers"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`website-${company.id}`}>Website</FieldLabel>
              <Input
                id={`website-${company.id}`}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`notes-${company.id}`}>Notes</FieldLabel>
              <Textarea
                id={`notes-${company.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Personal notes about this company"
              />
            </Field>
            <Button size="sm" disabled={isPending} onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : (
          <>
            {company.careersUrl && (
              <a
                href={company.careersUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary underline"
              >
                Careers page
              </a>
            )}
            {company.notes && (
              <p className="whitespace-pre-wrap">{company.notes}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
