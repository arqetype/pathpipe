import { Img, Row, Section, Text } from 'react-email';
import React from 'react';
import { Layout } from '../../components/layout';

type OTPEmailProps = {
  otp: string;
  user: {
    name: string;
    profilePictureUrl: string;
  };
};

export function OTPEmail({ otp, user }: OTPEmailProps) {
  const previewMessage =
    '👋 Welcome to Pathpipe! Use the OTP below to securely log in.';

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
          Welcome to Pathpipe!
        </Text>
        <Text className="text-foreground mt-2">
          We're excited to have you on board. Use the one-time password below to
          securely log in and start exploring.
        </Text>
      </Section>
      <Section>
        <Row>
          <Text className="text-lg text-foreground mt-4">
            Hi {user.name}, here is your one-time password (OTP):
          </Text>
          <Text
            className="text-2xl bg-accent p-4 text-center rounded-full tracking-widest
 font-bold text-primary"
          >
            {otp}
          </Text>
          <Text className="text-sm text-foreground mt-2">
            This OTP is valid for 10 minutes. If you did not request this OTP,
            please ignore this email and consider changing your password for
            security.
          </Text>
        </Row>
      </Section>
    </Layout>
  );
}

OTPEmail.PreviewProps = {
  otp: '123456',
  user: {
    name: 'John Doe',
    profilePictureUrl: 'https://picsum.photos/100',
  },
};

export default OTPEmail;
