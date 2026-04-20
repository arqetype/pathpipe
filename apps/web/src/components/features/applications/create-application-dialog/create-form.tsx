'use client';

import { useEffect, useState } from 'react';
import { useTransition } from 'react';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { CANDIDATE_STAGE_OPTIONS } from '../constants/status';
import { CreateCandidateDto } from '@repo/db/dto/candidate/create-candidate.dto';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm } from 'react-hook-form';
import { createApplicationAction } from '@/actions/application/create';
import { toast } from 'sonner';
import { useApplicationStore } from '../store';
import { CandidateStage } from '@repo/db/types/candidate/stage';
import { CandidateSource } from '@repo/db/types/candidate/source';

type CreateApplicationFormProps = {
  stage?: CandidateStage;
};

export function CreateApplicationForm({ stage }: CreateApplicationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { closeCreateDialog } = useApplicationStore();

  const form = useForm<CreateCandidateDto>({
    resolver: classValidatorResolver(CreateCandidateDto),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      linkedinUrl: '',
      stage: (stage as CandidateStage) || CandidateStage.APPLIED,
      source: CandidateSource.MANUAL,
    },
  });

  useEffect(() => {
    if (stage) {
      form.setValue('stage', stage);
    }
  }, [form, stage]);

  const handleSubmit = (data: CreateCandidateDto) => {
    startTransition(async () => {
      const result = await createApplicationAction({
        ...data,
        phone: data.phone || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
      });

      if (result.success) {
        toast.success('Candidate created successfully.');
        form.reset();
        setStatusMessage(null);
        closeCreateDialog();
      } else {
        setStatusMessage(result.message || 'Failed to create candidate.');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {statusMessage && (
          <div className="text-red-500 text-sm">{statusMessage}</div>
        )}

        <div className="flex gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input placeholder="Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <FormField
            control={form.control}
            name="stage"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Stage</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Source</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={CandidateSource.MANUAL}>
                        Manual
                      </SelectItem>
                      <SelectItem value={CandidateSource.CAREERS_PAGE}>
                        Careers page
                      </SelectItem>
                      <SelectItem value={CandidateSource.EMAIL}>
                        Email
                      </SelectItem>
                      <SelectItem value={CandidateSource.REFERRAL}>
                        Referral
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 555 000 0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkedinUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn URL</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/in/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Candidate'
          )}
        </Button>
      </form>
    </Form>
  );
}
