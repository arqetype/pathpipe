import { Button, Img, Row, Section, Text } from '@react-email/components';
import React from 'react';
import { Layout } from '../components/layout';

interface VerificationEmailProps {
  token: string;
  user: {
    name: string;
    profilePictureUrl: string;
  };
}

export function VerificationEmail({ token, user }: VerificationEmailProps) {
  const previewMessage = 'Click the button below to verify your email';
  const verificationUrl = `http://localhost:3000/app/verify-email?token=${token}`;
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
            Hi {user.name}, wanna verify your email?
          </Text>
          <Text className="text-lg">
            To complete your registration, please verify your email address by
            clicking the button below:
          </Text>
          <Button
            href={verificationUrl}
            className="bg-primary text-primary-foreground w-full py-3 text-center rounded-md focus:outline-none"
          >
            Verify Email
          </Button>
          <Text className="text-md">
            If you did not create an account, you can ignore this email.
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
