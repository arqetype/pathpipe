'use server';

import { get } from '@/lib/fetch';
import { GetMeetingResponseDto } from '@repo/db/dto/meetings/get-meeting.dto';

export type GetMeetingDataActionReturn =
  | { success: true; room: GetMeetingResponseDto['room'] }
  | { success: false; message: string };

export async function getMeetingDataAction(
  meetingId: string,
): Promise<GetMeetingDataActionReturn> {
  const response = await get(`/meeting/${meetingId}`);

  if (!response.ok) {
    return {
      success: false,
      message:
        response.statusText ||
        'Could not fetch meeting data. Please try again later.',
    };
  }

  const data: GetMeetingResponseDto = await response.json();

  return {
    success: true,
    room: data.room,
  };
}
