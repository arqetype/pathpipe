import type { Application } from '@repo/db/entities/application';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { ApplicationStatus } from '@repo/db/types/application/status';
import {
  RiMoneyDollarBoxLine,
  RiCalendarLine,
  RiExternalLinkLine,
  RiFlagLine,
  RiLinksLine,
  RiMailLine,
  RiUserLine,
  RiListUnordered,
} from '@remixicon/react';
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
import { TierSelectOptions } from '../shared/tier-select-options';
import { APPLICATION_TIER_OPTIONS } from '../constants/tier';

type ApplicationDialogPropertiesProps = {
  application: Application;
  onSave: (data: Partial<Application>) => void;
};

export function ApplicationDialogProperties({
  application,
  onSave,
}: ApplicationDialogPropertiesProps) {
  return (
    <div className="flex flex-col gap-1">
      <Property icon={<RiListUnordered className="size-4" />} label="Status">
        <Select
          value={application.status}
          onValueChange={(v) => onSave({ status: v as ApplicationStatus })}
        >
          <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
            <SelectValue placeholder="Status">
              {
                APPLICATION_STATUS_OPTIONS.find(
                  (opt) => opt.status === application.status,
                )?.label
              }
            </SelectValue>
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

      <Property icon={<RiFlagLine className="size-4" />} label="Tier">
        <Select
          value={application.tier}
          onValueChange={(v) => onSave({ tier: v as ApplicationTier })}
        >
          <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
            <SelectValue placeholder="Tier">
              {
                APPLICATION_TIER_OPTIONS.find(
                  (opt) => opt.value === application.tier,
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <TierSelectOptions />
            </SelectGroup>
          </SelectContent>
        </Select>
      </Property>

      <Property
        icon={<RiCalendarLine className="size-4" />}
        label="Applied date"
      >
        <InlineInput
          type="date"
          value={
            application.appliedAt
              ? new Date(application.appliedAt).toISOString().split('T')[0]
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

      <Property
        icon={<RiMoneyDollarBoxLine className="size-4" />}
        label="Salary"
      >
        <InlineInput
          type="number"
          value={application.salaryMin}
          placeholder="50"
          onSave={(v) => onSave({ salaryMin: v ? Number(v) : undefined })}
        />
        <span className="px-1 text-sm text-muted-foreground">to</span>
        <InlineInput
          type="number"
          value={application.salaryMax}
          placeholder="80"
          onSave={(v) => onSave({ salaryMax: v ? Number(v) : undefined })}
        />
      </Property>

      <Property icon={<RiLinksLine className="size-4" />} label="Job URL">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <InlineInput
            value={application.url}
            placeholder="https://…"
            onSave={(v) => onSave({ url: v })}
          />
          {application.url && (
            <a
              href={application.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiExternalLinkLine className="size-3.5" />
            </a>
          )}
        </div>
      </Property>

      <Property icon={<RiUserLine className="size-4" />} label="Contact">
        <InlineInput
          value={application.contactName}
          placeholder="Name"
          onSave={(v) => onSave({ contactName: v })}
        />
      </Property>

      <Property icon={<RiMailLine className="size-4" />} label="Email">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <InlineInput
            type="email"
            value={application.contactEmail}
            placeholder="email@company.com"
            onSave={(v) => onSave({ contactEmail: v })}
          />
          {application.contactEmail && (
            <a
              href={`mailto:${application.contactEmail}`}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiExternalLinkLine className="size-3.5" />
            </a>
          )}
        </div>
      </Property>
    </div>
  );
}
