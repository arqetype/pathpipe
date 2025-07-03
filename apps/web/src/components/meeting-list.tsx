import listMeetingsAction from '@/actions/meeting/list-meetings';
import Link from 'next/link';

export default async function MeetingList() {
  const response = await listMeetingsAction();

  if (!response.success) {
    return <div>Error: {response.message}</div>;
  }

  return (
    <div className="mt-4">
      <h3>Active Meetings List</h3>
      <ul>
        {response.rooms.map((meeting) => (
          <li key={meeting.id}>
            <Link href={`/app/meeting/${meeting.id}`}>
              Meeting {meeting.id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
