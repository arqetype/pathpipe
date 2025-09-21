import { Button, Img, Row, Section, Text } from '@react-email/components';
import React from 'react';
import { Layout } from '../../components/layout';

interface OrganizationInvitationEmailProps {
  token: string;
  organization: {
    name: string;
    profilePictureUrl: string;
  };
}

export function OrganizationInvitationEmail({
  token,
  organization,
}: OrganizationInvitationEmailProps) {
  const previewMessage =
    'Click the button below to accept the organization invitation';
  const invitationUrl = `http://localhost:3000/app/accept-invitation?token=${token}`;
  return (
    <Layout previewMessage={previewMessage}>
      <Section>
        <Img
          src={organization.profilePictureUrl}
          alt={`${organization.name}'s profile picture`}
          width="96"
          height="96"
          className="mx-auto mb-4 rounded-full"
        />
      </Section>
      <Section>
        <Row>
          <Text className="text-3xl font-bold">
            Hi, you've been invited to join {organization.name}!
          </Text>
          <Text className="text-lg">
            To accept the invitation, please click the button below:
          </Text>
          <Button
            href={invitationUrl}
            className="bg-primary text-primary-foreground w-full py-3 text-center rounded-md"
          >
            Accept Invitation
          </Button>
          <Text className="text-md">
            This invitation is valid for a limited time. If you did not request
            this invitation, you can ignore this email.
          </Text>
        </Row>
      </Section>
    </Layout>
  );
}

OrganizationInvitationEmail.PreviewProps = {
  token: 'bc8fcea8-07ea-4321-884a-ce9f1a01a9e0',
  organization: {
    name: 'Acme Corp',
    profilePictureUrl: 'https://picsum.photos/100',
  },
};

export default OrganizationInvitationEmail;
