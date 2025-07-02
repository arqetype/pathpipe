'use client';
import { useEffect, useState, useCallback } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { AvatarMoods, AvatarHairStyles } from '@repo/db/types/avatar';
import HorizontalSelect from './horizontal-select';
import AvatarCustomizationDto from '@repo/db/dto/settings/avatar-customization.dto';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { HexColorPicker } from '@repo/ui/components/color-picker';
import { Button } from '@repo/ui/components/button';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { useThrottle } from '@repo/ui/hooks/use-throttle';

const moodsOptions = AvatarMoods.map((mood) => ({
  label: mood.name,
  value: mood.value,
}));

const hairStylesOptions = AvatarHairStyles.map((style) => ({
  label: style.name,
  value: style.value,
}));

interface ColorFieldProps {
  name: keyof AvatarCustomizationDto;
  label: string;
  control: Control<AvatarCustomizationDto>;
}

const ColorField = ({ name, label, control }: ColorFieldProps) => (
  <FormField
    name={name}
    control={control}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <HexColorPicker
            color={'#' + field.value}
            onChange={(color) => field.onChange(color.replace('#', ''))}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export default function ProfilePictureEditor() {
  const form = useForm<AvatarCustomizationDto>({
    resolver: classValidatorResolver(AvatarCustomizationDto),
    defaultValues: {
      mood: AvatarMoods[0].value,
      hairStyle: AvatarHairStyles[0].value,
      hairColor: '000000',
      skinColor: 'ffffff',
      backgroundColor: 'ffffff',
      facialHair: false,
    },
  });

  const [formData, setFormData] = useState<AvatarCustomizationDto>();
  const debouncedSubscribedFormData = useDebounce(formData, 500);
  const debouncedAndThrottledFormData = useThrottle(
    debouncedSubscribedFormData,
    { delay: 500, leading: true, trailing: false },
  );

  // Memoize callback functions to prevent unnecessary re-renders
  const handleSubmit = useCallback((data: AvatarCustomizationDto) => {
    // todo send data to the server to save the avatar customization
    console.log('Saving avatar customization:', data);
  }, []);

  const handlePreview = useCallback((data: AvatarCustomizationDto) => {
    // todo send data to the server to preview the avatar customization
    console.log('Previewing avatar customization:', data);
  }, []);

  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        setFormData(values);
      },
    });

    return unsubscribe;
  }, [form]);

  useEffect(() => {
    if (debouncedAndThrottledFormData)
      handlePreview(debouncedAndThrottledFormData);
  }, [debouncedAndThrottledFormData, handlePreview]);

  return (
    <div className="bg-muted w-full min-h-96 rounded-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            name="mood"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mood</FormLabel>
                <FormControl>
                  <HorizontalSelect {...field} options={moodsOptions} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="hairStyle"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hair Style</FormLabel>
                <FormControl>
                  <HorizontalSelect {...field} options={hairStylesOptions} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-4 flex-wrap">
            <ColorField
              name="skinColor"
              label="Skin Color"
              control={form.control}
            />
            <ColorField
              name="hairColor"
              label="Hair Color"
              control={form.control}
            />
            <ColorField
              name="backgroundColor"
              label="Background Color"
              control={form.control}
            />
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      </Form>
    </div>
  );
}
