import { Button, Section, Text } from 'react-email';
import React from 'react';
import { Layout } from '../../components/layout';

interface VerificationEmailProps {
  token: string;
  appUrl?: string;
  user: {
    name: string;
  };
}

export function VerificationEmail({
  token,
  appUrl,
  user,
}: VerificationEmailProps) {
  const previewMessage =
    'Verify your email to complete your pathpipe registration.';
  const baseUrl = (appUrl ?? 'http://localhost:3000').replace(/\/$/, '');
  const verificationUrl = `${baseUrl}/app/verify-email?token=${token}`;

  return (
    <Layout previewMessage={previewMessage} appUrl={baseUrl}>
      <Section className="text-left">
        <Text className="text-2xl font-heading font-bold text-foreground m-0">
          Verify your email
        </Text>
        <Text className="text-base text-foreground mt-4 mb-0">
          Hi <span className="font-semibold">{user.name}</span>, click the
          button below to verify your email address and complete your
          registration.
        </Text>
      </Section>

      <Section className="mt-8 text-left">
        <Button
          href={verificationUrl}
          className="bg-primary font-semibold px-8 py-3 text-base text-center text-primary-foreground rounded-md btn-preserve"
        >
          Verify email
        </Button>
      </Section>

      <Section className="mt-6">
        <Text className="text-sm text-muted-foreground m-0 leading-6">
          This link expires in 10 minutes.
        </Text>
        <Text className="text-sm text-muted-foreground mt-2 m-0 leading-6">
          If you did not create an account, you can safely ignore this email.
        </Text>
      </Section>
    </Layout>
  );
}

VerificationEmail.PreviewProps = {
  token: 'bc8fcea8-07ea-4321-884a-ce9f1a01a9e0',
  user: {
    name: 'John Doe',
  },
};

export default VerificationEmail;
