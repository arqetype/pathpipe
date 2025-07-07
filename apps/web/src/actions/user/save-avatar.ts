'use server';

import { post } from '@/lib/fetch';
import { AvatarHairStyle, AvatarMood } from '@repo/db/types/user/avatar';
import { revalidatePath } from 'next/cache';

export async function saveAvatarCustomizationAction(data: {
  mood: AvatarMood;
  hairStyle?: AvatarHairStyle;
  hairColor: string;
  skinColor: string;
  backgroundColor: string;
  facialHair: boolean;
}) {
  const response = await post('/user/avatar/save', data);
  const json = await response.json();

  if (!response.ok) {
    console.log(json.message);
    return {
      success: false,
      message: 'Failed to save avatar customization',
    };
  }

  revalidatePath('/app/settings/profile', 'layout');

  return json;
}
