import { Section, Text } from 'react-email';
import React from 'react';
import { Layout } from '../../components/layout';

interface ResetPasswordConfirmationEmailProps {
  resetAt: string;
  appUrl?: string;
  user: {
    name: string;
  };
}

function formatResetAt(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(isoString));
}

export function ResetPasswordConfirmationEmail({
  resetAt,
  appUrl,
  user,
}: ResetPasswordConfirmationEmailProps) {
  const formattedDate = formatResetAt(resetAt);
  const previewMessage = 'Your Pathpipe password was successfully changed.';
  const baseUrl = (appUrl ?? 'http://localhost:3000').replace(/\/$/, '');

  return (
    <Layout previewMessage={previewMessage} appUrl={baseUrl}>
      <Section className="text-left">
        <Text className="text-2xl font-heading font-bold text-foreground m-0">
          Your password was changed
        </Text>
        <Text className="text-base text-foreground mt-4 mb-0">
          Hi <span className="font-semibold">{user.name}</span>, your Pathpipe
          password was successfully reset on{' '}
          <span className="font-semibold">{formattedDate} UTC</span>.
        </Text>
      </Section>

      <Section className="mt-6">
        <Text className="text-sm text-muted-foreground m-0 leading-6">
          If you made this change, no further action is needed.
        </Text>
        <Text className="text-sm text-muted-foreground mt-2 m-0 leading-6">
          If you did not reset your password, contact our support team
          immediately and secure your account.
        </Text>
      </Section>
    </Layout>
  );
}

ResetPasswordConfirmationEmail.PreviewProps = {
  resetAt: '2026-05-30T14:32:00.000Z',
  user: {
    name: 'John Doe',
  },
};

export default ResetPasswordConfirmationEmail;
