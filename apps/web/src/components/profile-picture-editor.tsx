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
import {
  HexColorPicker,
  SkinColorPicker,
} from '@repo/ui/components/color-picker';
import { Button } from '@repo/ui/components/button';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { useThrottle } from '@repo/ui/hooks/use-throttle';
import { previewAvatarCustomizationAction } from '@/actions/user/preview-avatar';
import { saveAvatarCustomizationAction } from '@/actions/user/save-avatar';
import Image from 'next/image';
import { toast } from 'sonner';
import { Loader2Icon, SaveIcon } from 'lucide-react';

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
      <FormItem className="flex flex-col gap-2 flex-1">
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
      hairColor: '502800',
      skinColor: 'D2B48C',
      backgroundColor: '18181C',
      facialHair: false,
    },
  });

  const [formData, setFormData] = useState<AvatarCustomizationDto>();
  const debouncedSubscribedFormData = useDebounce(formData, 500);
  const debouncedAndThrottledFormData = useThrottle(
    debouncedSubscribedFormData,
    { delay: 500, leading: true, trailing: false },
  );

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: AvatarCustomizationDto) => {
    const json = await saveAvatarCustomizationAction({
      mood: data.mood,
      hairStyle: data.hairStyle,
      hairColor: data.hairColor,
      skinColor: data.skinColor,
      backgroundColor: data.backgroundColor,
      facialHair: data.facialHair,
    });

    if (json.success) {
      toast.success(json.message || 'Avatar customization saved successfully.');
    } else {
      toast.error(
        json.message ||
          'Failed to save avatar customization. Please try again.',
      );
    }
  }, []);

  const handlePreview = useCallback(async (data: AvatarCustomizationDto) => {
    const json = await previewAvatarCustomizationAction({
      mood: data.mood,
      hairStyle: data.hairStyle,
      hairColor: data.hairColor,
      skinColor: data.skinColor,
      backgroundColor: data.backgroundColor,
      facialHair: data.facialHair,
    });

    if ('image' in json && json.image && typeof json.image === 'string') {
      setAvatarPreview(json.image);
    } else {
      toast.error(
        json.message ||
          'Failed to generate avatar preview. Please try again later.',
      );
    }
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
    handlePreview(form.getValues());
  }, [handlePreview, form]);

  useEffect(() => {
    if (debouncedAndThrottledFormData)
      handlePreview(debouncedAndThrottledFormData);
  }, [debouncedAndThrottledFormData, handlePreview]);

  return (
    <div className="bg-muted w-full min-h-96 rounded-lg p-4">
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Edit your Weaver Avatar !
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1">
          <div className="flex gap-4 py-4">
            <div className="flex flex-col gap-2">
              {avatarPreview && (
                <div className="relative size-56 mx-auto rounded overflow-hidden border-2 border-muted-foreground/20 ">
                  <Image
                    src={avatarPreview}
                    alt="Avatar Preview"
                    width={96}
                    height={96}
                    className="absolute inset-0 object-cover w-full h-full"
                  />
                  {formData !== debouncedAndThrottledFormData && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-white text-sm">
                      <Loader2Icon className="animate-spin text-primary" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <FormField
                name="mood"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How do you feel today?</FormLabel>
                    <FormControl className="p-0">
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
                  <FormItem className="flex-1">
                    <FormLabel>What is your hair style?</FormLabel>
                    <FormControl className="p-0">
                      <HorizontalSelect
                        {...field}
                        options={hairStylesOptions}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            <FormField
              name="skinColor"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2 flex-1">
                  <FormLabel>What is your skin color?</FormLabel>
                  <FormControl>
                    <SkinColorPicker
                      color={`#${field.value}`}
                      onChange={(color) =>
                        field.onChange(color.replace('#', ''))
                      }
                      swatchSize="md"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ColorField
              name="hairColor"
              label="What is your hair color?"
              control={form.control}
            />
            <ColorField
              name="backgroundColor"
              label="What is your favorite color?"
              control={form.control}
            />
          </div>
          <Button type="submit" className="w-full mt-4">
            <SaveIcon />
            Update my profile avatar
          </Button>
        </form>
      </Form>
    </div>
  );
}
