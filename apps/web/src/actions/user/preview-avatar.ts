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
    const response = await post('/user/avatar/preview', parsedInput);
    const json = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to preview avatar customization: ${json.message || 'Unknown error'}`,
      );
    }

    return json;
  });
