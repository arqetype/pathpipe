import type { Application } from '@repo/db/entities/application';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { ApplicationStatus } from '@repo/db/types/application/status';
import {
  Activity,
  Banknote,
  CalendarDays,
  ExternalLink,
  Flag,
  Link,
  Mail,
  User,
} from 'lucide-react';
import Property from '@repo/ui/components/customs/property';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { formatSalary } from '@/utils/applications-utils';
import { TierSelectOptions } from '../shared/tier-select-options';

type ApplicationDialogPropertiesProps = {
  app: Application;
  onSave: (data: Partial<Application>) => void;
};

export function ApplicationDialogProperties({
  app,
  onSave,
}: ApplicationDialogPropertiesProps) {
  const salary = formatSalary(app.salaryMin, app.salaryMax);

  return (
    <div className="px-8 py-4 flex flex-col gap-1">
      <Property icon={<Activity className="size-4" />} label="Status">
        <Select
          value={app.status}
          onValueChange={(v) => onSave({ status: v as ApplicationStatus })}
        >
          <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {APPLICATION_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.status} value={opt.status}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Property>

      <Property icon={<Flag className="size-4" />} label="Tier">
        <Select
          value={app.tier}
          onValueChange={(v) => onSave({ tier: v as ApplicationTier })}
        >
          <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <TierSelectOptions />
            </SelectGroup>
          </SelectContent>
        </Select>
      </Property>

      <Property icon={<CalendarDays className="size-4" />} label="Applied date">
        <InlineInput
          type="date"
          value={
            app.appliedAt
              ? new Date(app.appliedAt).toISOString().split('T')[0]
              : ''
          }
          placeholder="Pick a date"
          onSave={(v) =>
            onSave({
              appliedAt: v ? (new Date(v) as unknown as Date) : undefined,
            })
          }
        />
      </Property>

      <Property icon={<Banknote className="size-4" />} label="Salary">
        <InlineInput
          type="number"
          value={app.salaryMin}
          placeholder="50"
          onSave={(v) => onSave({ salaryMin: v ? Number(v) : undefined })}
        />
        <span className="px-1 text-sm text-muted-foreground">to</span>
        <InlineInput
          type="number"
          value={app.salaryMax}
          placeholder="80"
          onSave={(v) => onSave({ salaryMax: v ? Number(v) : undefined })}
        />
      </Property>

      <Property icon={<Link className="size-4" />} label="Job URL">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <InlineInput
            value={app.url}
            placeholder="https://…"
            onSave={(v) => onSave({ url: v })}
          />
          {app.url && (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </Property>

      <Property icon={<User className="size-4" />} label="Contact">
        <InlineInput
          value={app.contactName}
          placeholder="Name"
          onSave={(v) => onSave({ contactName: v })}
        />
      </Property>

      <Property icon={<Mail className="size-4" />} label="Email">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <InlineInput
            type="email"
            value={app.contactEmail}
            placeholder="email@company.com"
            onSave={(v) => onSave({ contactEmail: v })}
          />
          {app.contactEmail && (
            <a
              href={`mailto:${app.contactEmail}`}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </Property>
    </div>
  );
}
