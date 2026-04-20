import type { Candidate } from '@repo/db/entities/candidate';
import { CandidateStage } from '@repo/db/types/candidate/stage';
import { CandidateSource } from '@repo/db/types/candidate/source';
import {
  Activity,
  ExternalLink,
  Link,
  Mail,
  Phone,
  Radio,
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
import { CANDIDATE_STAGE_OPTIONS } from '../constants/status';

type ApplicationDialogPropertiesProps = {
  application: Candidate;
  onSave: (data: Partial<Candidate>) => void;
};

export function ApplicationDialogProperties({
  application,
  onSave,
}: ApplicationDialogPropertiesProps) {
  return (
    <div className="px-8 py-4 flex flex-col gap-1">
      <Property icon={<Activity className="size-4" />} label="Stage">
        <Select
          value={application.stage}
          onValueChange={(v) => onSave({ stage: v as CandidateStage })}
        >
          <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {CANDIDATE_STAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.status} value={opt.status}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Property>

      <Property icon={<Radio className="size-4" />} label="Source">
        <Select
          value={application.source}
          onValueChange={(v) => onSave({ source: v as CandidateSource })}
        >
          <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={CandidateSource.MANUAL}>Manual</SelectItem>
              <SelectItem value={CandidateSource.CAREERS_PAGE}>
                Careers page
              </SelectItem>
              <SelectItem value={CandidateSource.EMAIL}>Email</SelectItem>
              <SelectItem value={CandidateSource.REFERRAL}>Referral</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Property>

      <Property icon={<Phone className="size-4" />} label="Phone">
        <InlineInput
          value={application.phone}
          placeholder="+1 555 000 0000"
          onSave={(v) => onSave({ phone: v })}
        />
      </Property>

      <Property icon={<Link className="size-4" />} label="LinkedIn">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <InlineInput
            value={application.linkedinUrl}
            placeholder="https://linkedin.com/in/..."
            onSave={(v) => onSave({ linkedinUrl: v })}
          />
          {application.linkedinUrl && (
            <a
              href={application.linkedinUrl}
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
          value={application.contactName}
          placeholder="Name"
          onSave={(v) => onSave({ contactName: v })}
        />
      </Property>

      <Property icon={<Mail className="size-4" />} label="Email">
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
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </Property>
    </div>
  );
}
