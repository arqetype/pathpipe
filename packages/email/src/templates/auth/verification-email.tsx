import { Button, Img, Row, Section, Text } from 'react-email';
import React from 'react';
import { Layout } from '../../components/layout';

interface VerificationEmailProps {
  token: string;
  user: {
    name: string;
    profilePictureUrl: string;
  };
}

export function VerificationEmail({ token, user }: VerificationEmailProps) {
  const previewMessage =
    '👋 Welcome to Weaver! Verify your email to complete your registration.';
  const verificationUrl = `http://localhost:3000/app/verify-email?token=${token}`;
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
          Welcome to Weaver!
        </Text>
        <Text className="text-foreground mt-2">
          We're excited to have you on board. Please verify your email address
          to complete your registration and start exploring.
        </Text>
      </Section>
      <Section>
        <Row>
          <Text className="text-lg text-foreground mt-4">
            Hi {user.name}, click the button below to verify your email address:
          </Text>
          <Button
            href={verificationUrl}
            className="text-lg w-full bg-primary font-semibold p-2 text-center rounded-full text-primary-foreground"
          >
            Verify Email
          </Button>
          <Text className="text-sm text-foreground mt-2">
            If you did not create an account, please ignore this email. If you
            have any concerns, feel free to contact our support team.
          </Text>
        </Row>
      </Section>
    </Layout>
  );
}

VerificationEmail.PreviewProps = {
  token: 'bc8fcea8-07ea-4321-884a-ce9f1a01a9e0',
  user: {
    name: 'John Doe',
    profilePictureUrl: 'https://picsum.photos/100',
  },
};

export default VerificationEmail;
