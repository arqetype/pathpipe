import { Button, Img, Row, Section, Text } from '@react-email/components';
import { Layout } from '../components/layout';
import React from 'react';

interface ResetPasswordEmailProps {
  token: string;
  user: {
    name: string;
    profilePictureUrl: string;
  };
}

export function ResetPasswordEmail({ token, user }: ResetPasswordEmailProps) {
  const previewMessage = 'Click the button below to reset your password';
  const resetUrl = `http://localhost:3000/app/reset-password?token=${token}`;

  return (
    <Layout previewMessage={previewMessage}>
      <Section>
        <Img
          src={user.profilePictureUrl}
          alt={`${user.name}'s profile picture`}
          width="96"
          height="96"
          className="mx-auto mb-4 rounded-full"
        />
      </Section>
      <Section>
        <Row>
          <Text className="text-3xl font-bold">
            Hi {user.name}, forgot your password?
          </Text>
          <Text className="text-lg">
            Someone recently requested a password change for your Mealbud
            account. If this was you, you can set a new password here:
          </Text>
          <Button
            href={resetUrl}
            className="bg-primary text-primary-foreground w-full py-3 text-center rounded-md focus:outline-none"
          >
            Reset Password
          </Button>
          <Text className="text-md">
            If you don't want to change your password or didn't request this,
            just ignore and delete this message.
          </Text>
        </Row>
      </Section>
    </Layout>
  );
}

ResetPasswordEmail.PreviewProps = {
  token: 'bc8fcea8-07ea-4321-884a-ce9f1a01a9e0',
  user: {
    name: 'John Doe',
    profilePictureUrl: 'https://picsum.photos/100',
  },
};

export default ResetPasswordEmail;
