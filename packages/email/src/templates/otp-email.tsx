import { Button, Head, Html } from '@react-email/components';
import React from 'react';

interface OTPEmailProps {
  otp: string;
}

export const OTPEmail: React.FC<OTPEmailProps> = ({ otp }) => (
  <Html lang="en">
    <Head>
      <title>Verify your email address</title>
    </Head>{' '}
    <h1>OTP: {otp}</h1>
  </Html>
);
