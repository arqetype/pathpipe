import { Button, Head, Html } from '@react-email/components';
import React from 'react';

interface VerificationEmailProps {
  token: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  token,
}) => (
  <Html lang="en">
    <Head>
      <title>Verify your email address</title>
    </Head>{' '}
    <Button href={`http://localhost:3000/app/verify-email?token=${token}`}>
      Verify Email
    </Button>
  </Html>
);
