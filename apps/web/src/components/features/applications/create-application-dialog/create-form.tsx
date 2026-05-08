'use client';

import { useEffect, useState } from 'react';
import { useTransition } from 'react';
import { RiLoader5Line } from '@remixicon/react';
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
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm } from 'react-hook-form';
import { createApplicationAction } from '@/actions/application/create';
import { toast } from 'sonner';
import { useApplicationStore } from '../store';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { TierSelectOptions } from '../shared/tier-select-options';
import SelectCompany from '@/components/shared/select-company';

type CreateApplicationFormProps = {
  status?: ApplicationStatus;
};

export function CreateApplicationForm({ status }: CreateApplicationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { closeCreateDialog } = useApplicationStore();

  const form = useForm<CreateApplicationDto>({
    resolver: classValidatorResolver(CreateApplicationDto),
    defaultValues: {
      company: '',
      position: '',
      status: (status as ApplicationStatus) || ApplicationStatus.WISHLIST,
      tier: ApplicationTier.NONE,
      url: '',
      salaryMin: undefined,
      salaryMax: undefined,
      appliedAt: '',
    },
  });

  useEffect(() => {
    if (status) {
      form.setValue('status', status);
    }
  }, [form, status]);

  const handleSubmit = (data: CreateApplicationDto) => {
    startTransition(async () => {
      const result = await createApplicationAction({
        ...data,
        url: data.url || undefined,
        appliedAt: data.appliedAt || undefined,
      });

      if (result.success) {
        toast.success('Application created successfully.');
        form.reset();
        setStatusMessage(null);
        closeCreateDialog();
      } else {
        setStatusMessage(result.message || 'Failed to create application.');
      }
    });
  };

  const renderFormContent = () => (
    <>
      <div className="flex gap-3">
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Company</FormLabel>
              <FormControl>
                <SelectCompany
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input placeholder="Software Engineer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex gap-3">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
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
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tier"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Tier</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <TierSelectOptions />
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="appliedAt"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Applied Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job URL</FormLabel>
            <FormControl>
              <Input placeholder="https://jobs.example.com/..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-3">
        <FormField
          control={form.control}
          name="salaryMin"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Salary Min</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="50000"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="salaryMax"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Salary Max</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="80000"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {statusMessage && (
          <div className="text-red-500 text-sm">{statusMessage}</div>
        )}
        {renderFormContent()}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <RiLoader5Line className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Application'
          )}
        </Button>
      </form>
    </Form>
  );
}
