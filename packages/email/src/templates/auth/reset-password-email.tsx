import { Button, Section, Text } from 'react-email';
import { Layout } from '../../components/layout';
import React from 'react';

interface ResetPasswordEmailProps {
  token: string;
  appUrl?: string;
  user: {
    name: string;
  };
}

export function ResetPasswordEmail({
  token,
  appUrl,
  user,
}: ResetPasswordEmailProps) {
  const previewMessage = 'Reset your pathpipe password.';
  const baseUrl = (appUrl ?? 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/app/reset-password?token=${token}`;

  return (
    <Layout previewMessage={previewMessage} appUrl={baseUrl}>
      <Section className="text-left">
        <Text className="text-2xl font-heading font-bold text-foreground m-0">
          Reset your password
        </Text>
        <Text className="text-base text-foreground mt-4 mb-0">
          Hi <span className="font-semibold">{user.name}</span>, click the
          button below to reset your password and regain access to your account.
        </Text>
      </Section>

      <Section className="mt-8 text-left">
        <Button
          href={resetUrl}
          className="bg-primary font-semibold px-8 py-3 text-base text-center text-primary-foreground rounded-md btn-preserve"
        >
          Reset password
        </Button>
      </Section>

      <Section className="mt-6">
        <Text className="text-sm text-muted-foreground m-0 leading-6">
          This link expires in 10 minutes.
        </Text>
        <Text className="text-sm text-muted-foreground mt-2 m-0 leading-6">
          If you did not request a password reset, you can safely ignore this
          email.
        </Text>
      </Section>
    </Layout>
  );
}

ResetPasswordEmail.PreviewProps = {
  token: 'bc8fcea8-07ea-4321-884a-ce9f1a01a9e0',
  user: {
    name: 'John Doe',
  },
};

export default ResetPasswordEmail;
