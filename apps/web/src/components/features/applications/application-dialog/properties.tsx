import type { Application } from '@repo/db/entities/application';
import { ApplicationPriority } from '@repo/db/types/application/priority';
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
import { cn } from '@repo/ui/lib/utils';
import Property from '@repo/ui/components/property';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@repo/ui/components/select';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import {
  APPLICATION_PRIORITY_OPTIONS,
  PRIORITY_CONFIG,
} from '../constants/priority';
import { formatSalary } from '@/utils/applications-utils';

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
          <SelectTrigger
            variant="ghost"
            className="w-full px-2 -ml-2 [&>svg]:hidden"
          >
            {(() => {
              const cfg = APPLICATION_STATUS_OPTIONS.find(
                (s) => s.status === app.status,
              );
              return (
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2 rounded-full shrink-0',
                      cfg?.dotClass,
                    )}
                  />
                  {cfg?.label}
                </span>
              );
            })()}
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.status} value={opt.status}>
                <span className="flex items-center gap-2">
                  <span
                    className={cn('size-2 rounded-full shrink-0', opt.dotClass)}
                  />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Property>

      <Property icon={<Flag className="size-4" />} label="Priority">
        <Select
          value={app.priority}
          onValueChange={(v) => onSave({ priority: v as ApplicationPriority })}
        >
          <SelectTrigger
            variant="ghost"
            className="w-full px-2 -ml-2 [&>svg]:hidden"
          >
            {(() => {
              const v = app.priority;
              const cfg = PRIORITY_CONFIG[v];
              return v === ApplicationPriority.NONE ? (
                <span className="text-muted-foreground">None</span>
              ) : (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded border font-medium',
                    cfg.className,
                  )}
                >
                  {cfg.label}
                </span>
              );
            })()}
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_PRIORITY_OPTIONS.map((opt) => {
              const cfg = PRIORITY_CONFIG[opt.value as ApplicationPriority];
              return (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.value === ApplicationPriority.NONE ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded border font-medium',
                        cfg.className,
                      )}
                    >
                      {cfg.label}
                    </span>
                  )}
                </SelectItem>
              );
            })}
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
        {salary ? (
          <div className="flex items-center gap-1.5 px-2 -ml-2 h-8">
            <span>{salary}</span>
          </div>
        ) : (
          <span className="px-2 -ml-2 h-8 flex items-center text-muted-foreground/50 italic text-sm">
            Not specified
          </span>
        )}
      </Property>

      <Property icon={<Banknote className="size-4" />} label="Salary min">
        <InlineInput
          type="number"
          value={app.salaryMin}
          placeholder="50 000"
          onSave={(v) => onSave({ salaryMin: v ? Number(v) : undefined })}
        />
      </Property>

      <Property icon={<Banknote className="size-4" />} label="Salary max">
        <InlineInput
          type="number"
          value={app.salaryMax}
          placeholder="80 000"
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
