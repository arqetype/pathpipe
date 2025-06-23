import { Button, Head, Html } from '@react-email/components';
import React from 'react';

interface ResetPasswordEmailProps {
  token: string;
}

export const ResetPasswordEmail: React.FC<ResetPasswordEmailProps> = ({
  token,
}) => (
  <Html lang="en">
    <Head>
      <title>Reset your password</title>
    </Head>{' '}
    <Button href={`http://localhost:3000/app/reset-password?token=${token}`}>
      Reset Password
    </Button>
  </Html>
);
