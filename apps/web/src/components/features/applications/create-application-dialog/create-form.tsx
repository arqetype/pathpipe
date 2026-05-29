'use client';

import { useEffect, useState } from 'react';
import { useTransition } from 'react';
import { RiLoader5Line } from '@remixicon/react';
import { Button } from '@repo/ui/components/button';
import { Controller, useForm } from 'react-hook-form';
import { Field, FieldLabel, FieldError } from '@repo/ui/components/field';
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
import { createApplicationAction } from '@/actions/application/create';
import { toast } from 'sonner';
import { useApplicationStore } from '../store';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { TierSelectOptions } from '../shared/tier-select-options';
import SelectCompany from '@/components/shared/select-company';
import { APPLICATION_TIER_OPTIONS } from '../constants/tier';
import { DialogFooter } from '@repo/ui/components/dialog';

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
        <Controller
          name="company"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Company</FieldLabel>
              <SelectCompany
                value={field.value ?? ''}
                onValueChange={field.onChange}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="position"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Position</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Software Engineer"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="flex gap-3">
        <Controller
          name="status"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Status</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={field.name}
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue>
                    {
                      APPLICATION_STATUS_OPTIONS.find(
                        (opt) => opt.status === field.value,
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="tier"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Tier</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={field.name}
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue>
                    {
                      APPLICATION_TIER_OPTIONS.find(
                        (opt) => opt.value === field.value,
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="appliedAt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Applied Date</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="date"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Controller
        name="url"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Job URL</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="https://jobs.example.com/..."
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex gap-3">
        <Controller
          name="salaryMin"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Salary Min</FieldLabel>
              <Input
                type="number"
                placeholder="50000"
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                value={field.value ?? ''}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="salaryMax"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Salary Max</FieldLabel>
              <Input
                type="number"
                placeholder="80000"
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                value={field.value ?? ''}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </>
  );

  return (
    <>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {statusMessage && (
          <div className="text-red-500 text-sm">{statusMessage}</div>
        )}
        {renderFormContent()}
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <RiLoader5Line className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Application'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
