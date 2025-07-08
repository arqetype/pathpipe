'use server';

import { post } from '@/lib/fetch';
import { AvatarHairStyle, AvatarMood } from '@repo/db/types/user/avatar';

export async function previewAvatarCustomizationAction(data: {
  mood: AvatarMood;
  hairStyle?: AvatarHairStyle;
  hairColor: string;
  skinColor: string;
  backgroundColor: string;
  facialHair: boolean;
}) {
  const response = await post('/user/avatar/preview', data);
  const json = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: json.message || 'Failed to generate avatar preview',
    };
  }

  return json;
}
