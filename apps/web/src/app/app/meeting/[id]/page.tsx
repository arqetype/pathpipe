import { getMeetingDataAction } from '@/actions/meeting/get-meeting-data';
import MeetingWrapper from '@/components/meeting-wrapper';
import { notFound } from 'next/navigation';

type MeetingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeetingPage({ params }: MeetingPageProps) {
  const { id } = await params;

  const meeting = await getMeetingDataAction(id);

  if (!meeting.success) {
    return notFound();
  }

  return <MeetingWrapper meeting={meeting.room} />;
}
