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
    const { ok, data } = await post<AvatarCustomizationSaveResponseDto>(
      '/user/avatar/save',
      parsedInput,
    );

    if (!ok) {
      throw new Error(
        `Failed to save avatar customization: ${data.message || 'Unknown error'}`,
      );
    }

    revalidatePath('/app/settings/profile', 'layout');

    return data;
  });
