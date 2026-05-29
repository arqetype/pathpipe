import { Button, Img, Row, Section, Text } from 'react-email';
import { Layout } from '../../components/layout';
import React from 'react';

interface ResetPasswordEmailProps {
  token: string;
  user: {
    name: string;
    profilePictureUrl: string;
  };
}

export function ResetPasswordEmail({ token, user }: ResetPasswordEmailProps) {
  const previewMessage =
    '👋 Reset your password! Reset your password to regain access to your account.';
  const resetUrl = `http://localhost:3000/app/reset-password?token=${token}`;

  return (
    <Layout previewMessage={previewMessage}>
      <Section className="text-center">
        <Img
          src={user.profilePictureUrl}
          alt={`${user.name}'s profile picture`}
          width="96"
          height="96"
          className="mx-auto mb-4 rounded-full"
        />
        <Text className="text-3xl font-bold text-primary">
          Reset your password
        </Text>
        <Text className="text-foreground mt-2">
          We're excited to have you on board. Use the link below to securely
          reset your password and regain access to your account.
        </Text>
      </Section>
      <Section>
        <Row>
          <Text className="text-lg text-foreground mt-4">
            Hi {user.name}, click the button below to reset your password:
          </Text>
          <Button
            href={resetUrl}
            className="text-lg w-full bg-primary font-semibold p-2 text-center rounded-full text-primary-foreground"
          >
            Reset password
          </Button>
          <Text className="text-sm text-foreground mt-2">
            This link is valid for 10 minutes. If you did not request this
            password reset, please ignore this email and consider changing your
            password for security.
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
