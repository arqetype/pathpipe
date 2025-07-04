'use server';

import { post } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import {
  AvatarCustomizationDto,
  AvatarCustomizationSaveResponseDto,
} from '@repo/db/dto/settings/avatar-customization.dto';
import { revalidatePath } from 'next/cache';

export const saveAvatarCustomizationAction = action
  .needsAuth()
  .inputDto(AvatarCustomizationDto)
  .outputDto(AvatarCustomizationSaveResponseDto)
  .action(async ({ parsedInput }) => {
    const response = await post('/user/avatar/save', parsedInput);
    const json = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to save avatar customization: ${json.message || 'Unknown error'}`,
      );
    }

    revalidatePath('/app/settings/profile', 'layout');

    return json;
  });
