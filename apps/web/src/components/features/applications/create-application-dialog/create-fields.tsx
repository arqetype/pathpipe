'use client';

import { Controller, type Control } from 'react-hook-form';
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
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import SelectCompany from '@/components/shared/select-company';
import SelectLocation from '@/components/shared/select-location';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { APPLICATION_TIER_OPTIONS } from '../constants/tier';
import { TierSelectOptions } from '../shared/tier-select-options';

type CreateFieldsProps = {
  control: Control<CreateApplicationDto>;
};

export function CreateFields({ control }: CreateFieldsProps) {
  return (
    <>
      <div className="flex gap-3">
        <Controller
          name="company"
          control={control}
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
          control={control}
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
          control={control}
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
          control={control}
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
          control={control}
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
        name="city"
        control={control}
        render={({ field: cityField, fieldState }) => (
          <Controller
            name="country"
            control={control}
            render={({ field: countryField, fieldState: countryState }) => (
              <Field data-invalid={fieldState.invalid || countryState.invalid}>
                <FieldLabel htmlFor={cityField.name}>Location</FieldLabel>
                <SelectLocation
                  value={{
                    city: cityField.value ?? '',
                    country: countryField.value ?? '',
                  }}
                  onChange={(next) => {
                    cityField.onChange(next.city);
                    countryField.onChange(next.country);
                  }}
                />
                {/* Country error must stay visible. */}
                {(fieldState.invalid || countryState.invalid) && (
                  <FieldError
                    errors={[fieldState.error ?? countryState.error]}
                  />
                )}
              </Field>
            )}
          />
        )}
      />

      <Controller
        name="url"
        control={control}
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
          control={control}
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
          control={control}
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
}
