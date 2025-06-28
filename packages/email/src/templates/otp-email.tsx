import { Img, Row, Section, Text } from '@react-email/components';
import React from 'react';
import { Layout } from '../components/layout';

type OTPEmailProps = {
  otp: string;
  user: {
    name: string;
    profilePictureUrl: string;
  };
};

export function OTPEmail({ otp, user }: OTPEmailProps) {
  const previewMessage = 'Your one-time password (OTP) for Mealbud.ai';

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
            Hi {user.name}, here is your OTP
          </Text>
          <Text className="text-md">
            Use this one-time password to complete your login or verification
            process. This OTP is valid for a short period, so please use it
            promptly.
          </Text>
          <Text className="text-2xl bg-gray-200 p-4 text-center rounded-md">
            {otp}
          </Text>
          <Text className="text-sm text-gray-500">
            If you did not request this OTP, please ignore this email, and
            consider changing your password for security.
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
