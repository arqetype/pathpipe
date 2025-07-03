'use client';

import { GetMeetingResponseDto } from '@repo/db/dto/meetings/get-meeting.dto';
import { useState } from 'react';
import Meeting from './meeting';

type MeetingWrapperProps = {
  meeting: GetMeetingResponseDto['room'];
};

export default function MeetingWrapper(props: MeetingWrapperProps) {
  const [wantsToJoin, setWantsToJoin] = useState(false);

  if (!wantsToJoin) {
    return (
      <div>
        <h2>Meeting: {props.meeting.id}</h2>
        <p>
          You are about to join the meeting with ID:{' '}
          <strong>{props.meeting.id}</strong>
        </p>
        <ul>
          {props.meeting.peers.map((participant) => (
            <li key={participant}>Participant: {participant}</li>
          ))}
        </ul>
        <button onClick={() => setWantsToJoin(true)}>Join Meeting</button>
      </div>
    );
  }

  return <Meeting meeting={props.meeting} />;
}
