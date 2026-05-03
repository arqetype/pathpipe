'use client';
import { useEffect, useState, useCallback } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { AvatarMoods, AvatarHairStyles } from '@repo/db/types/user/avatar';
import {
  HorizontalSelect,
  HorizontalSelectItem,
} from '@repo/ui/components/customs/horizontal-select';
import { AvatarCustomizationDto } from '@repo/db/dto/settings/avatar-customization.dto';
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
  SKIN_TONES,
} from '@repo/ui/components/color-picker';
import { Button } from '@repo/ui/components/button';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { useThrottle } from '@repo/ui/hooks/use-throttle';
import { previewAvatarCustomizationAction } from '@/actions/user/preview-avatar';
import { saveAvatarCustomizationAction } from '@/actions/user/save-avatar';
import Image from 'next/image';
import { toast } from 'sonner';
import { RiLoader5Line, RiSaveLine, RiDice5Line } from '@remixicon/react';
import Link from 'next/link';

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

const generateRandomColor = () => {
  const randomColor = Math.floor(Math.random() * 0xffffff).toString(16);
  return randomColor.padStart(6, '0');
};

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
    const result = await saveAvatarCustomizationAction({
      mood: data.mood,
      hairStyle: data.hairStyle,
      hairColor: data.hairColor,
      skinColor: data.skinColor,
      backgroundColor: data.backgroundColor,
      facialHair: data.facialHair,
    });

    if (result.success) {
      toast.success(result.data.message);
    } else {
      toast.error(
        result.message ||
          'Failed to save avatar customization. Please try again.',
      );
    }
  }, []);

  const handlePreview = useCallback(async (data: AvatarCustomizationDto) => {
    const result = await previewAvatarCustomizationAction(data);

    if (result.success) {
      setAvatarPreview(result.data.image);
    } else {
      toast.error(
        result.message ||
          'Failed to generate avatar preview. Please try again.',
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

  const handleRandomValue = useCallback(() => {
    form.setValue(
      'mood',
      AvatarMoods[Math.floor(Math.random() * AvatarMoods.length)]?.value ||
        AvatarMoods[0].value,
    );
    form.setValue(
      'hairStyle',
      AvatarHairStyles[Math.floor(Math.random() * AvatarHairStyles.length)]
        ?.value || AvatarHairStyles[0].value,
    );
    form.setValue('hairColor', generateRandomColor());
    form.setValue(
      'skinColor',
      SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]?.replace(
        '#',
        '',
      ) || '',
    );
    form.setValue('backgroundColor', generateRandomColor());

    handlePreview(form.getValues());
  }, [form, handlePreview]);

  useEffect(() => {
    handleRandomValue();
  }, [handleRandomValue]);

  useEffect(() => {
    if (debouncedAndThrottledFormData)
      handlePreview(debouncedAndThrottledFormData);
  }, [debouncedAndThrottledFormData, handlePreview]);

  return (
    <div className="bg-muted w-full min-h-96 rounded-lg p-4">
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Create your Weaver Avatar !
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1">
          <div className="flex flex-col gap-4 py-4 sm:flex-row">
            <div className="flex flex-col gap-2">
              <div className="relative size-56 mx-auto rounded-[20%] overflow-hidden">
                {avatarPreview && (
                  <Image
                    src={avatarPreview}
                    alt="Avatar Preview"
                    width={96}
                    height={96}
                    className="absolute inset-0 object-cover w-full h-full"
                  />
                )}
                {formData !== debouncedAndThrottledFormData && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-white text-sm">
                    <RiLoader5Line className="animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <FormField
                name="mood"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How do you feel today?</FormLabel>
                    <FormControl className="p-0">
                      <HorizontalSelect
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        {moodsOptions.map((o) => (
                          <HorizontalSelectItem key={o.value} value={o.value}>
                            {o.label}
                          </HorizontalSelectItem>
                        ))}
                      </HorizontalSelect>
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
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        {hairStylesOptions.map((o) => (
                          <HorizontalSelectItem key={o.value} value={o.value}>
                            {o.label}
                          </HorizontalSelectItem>
                        ))}
                      </HorizontalSelect>
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
          <div className="mt-4 p-3 bg-muted-foreground/5 rounded-md border">
            <p className="text-xs text-muted-foreground text-center">
              This avatar style is a remix of:{' '}
              <Link
                href="https://www.figma.com/community/file/1356575240759683500/dylan-the-avatar-generator"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Dylan! The Avatar Generator
              </Link>{' '}
              by{' '}
              <Link
                href={'https://nataspvk.tilda.ws/'}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Natalia Spivak
              </Link>
              , licensed under{' '}
              <Link
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                CC BY 4.0
              </Link>
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              size="icon"
              onClick={handleRandomValue}
            >
              <RiDice5Line />
            </Button>
            <Button type="submit" className="flex-1 mt-4">
              <RiSaveLine />
              Update my profile avatar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
