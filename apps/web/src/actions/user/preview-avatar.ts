'use server';

import { post } from '@/lib/fetch';
import { action } from '@/lib/safe-action';
import {
  AvatarCustomizationDto,
  AvatarCustomizationResponseDto,
} from '@repo/db/dto/settings/avatar-customization.dto';

export const previewAvatarCustomizationAction = action
  .needsAuth()
  .inputDto(AvatarCustomizationDto)
  .outputDto(AvatarCustomizationResponseDto)
  .action(async ({ parsedInput }) => {
    const { ok, data } = await post<AvatarCustomizationResponseDto>(
      '/user/avatar/preview',
      parsedInput,
    );

    if (!ok) {
      throw new Error(
        `Failed to preview avatar customization: ${data.message || 'Unknown error'}`,
      );
    }

    return data;
  });
