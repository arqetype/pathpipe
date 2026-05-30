import { Section, Text } from 'react-email';
import React from 'react';
import { Layout } from '../../components/layout';

type OTPEmailProps = {
  otp: string;
  appUrl?: string;
  user: {
    name: string;
  };
};

export function OTPEmail({ otp, appUrl, user }: OTPEmailProps) {
  const previewMessage = `${otp} is your pathpipe sign-in code.`;
  const baseUrl = (appUrl ?? 'http://localhost:3000').replace(/\/$/, '');

  return (
    <Layout previewMessage={previewMessage} appUrl={baseUrl}>
      <Section className="text-left">
        <Text className="text-2xl font-heading font-bold text-foreground m-0">
          Verify your email
        </Text>
        <Text className="text-base text-foreground mt-4 mb-0">
          Hi <span className="font-semibold">{user.name}</span>, enter the code
          below in your browser window to sign in to your pathpipe account.
        </Text>
      </Section>

      <Section className="mt-8">
        <Text className="text-4xl rounded-md bg-muted py-4 px-6 font-heading text-center tracking-widest font-bold text-foreground border border-border m-0">
          {otp}
        </Text>
      </Section>

      <Section className="mt-6">
        <Text className="text-sm text-muted-foreground m-0 leading-6">
          This code expires in 10 minutes.
        </Text>
        <Text className="text-sm text-muted-foreground mt-2 m-0 leading-6">
          If you did not request this email, you can safely ignore it. Someone
          else may have typed your email address by mistake.
        </Text>
      </Section>
    </Layout>
  );
}

OTPEmail.PreviewProps = {
  otp: '123456',
  user: {
    name: 'John Doe',
  },
};

export default OTPEmail;
