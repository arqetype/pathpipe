'use server';

import { get } from '@/lib/fetch';
import { ListMeetingResponseDto } from '@repo/db/dto/meetings/list-meeting.dto';

type ListMeetingsActionReturn =
  | {
      success: true;
      rooms: ListMeetingResponseDto['rooms'];
    }
  | {
      success: false;
      message: string;
    };

export default async function listMeetingsAction(): Promise<ListMeetingsActionReturn> {
  const response = await get('/meeting/all');

  if (!response.ok) {
    return {
      success: false,
      message:
        response.statusText ||
        'Could not fetch meetings. Please try again later.',
    };
  }

  const data: ListMeetingResponseDto = await response.json();

  return {
    success: true,
    rooms: data.rooms,
  };
}
