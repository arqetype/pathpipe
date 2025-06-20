import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
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
    </Head>
    <Tailwind>
      <Body className="bg-[#f4f6fa] font-sans py-10">
        <Container className="max-w-md mx-auto p-0">
          <Section className="relative flex flex-col items-center justify-center">
            {/* Blue checkmark icon, overlapping card */}
            <div
              style={{
                position: 'absolute',
                top: -40,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
                width: 72,
                height: 72,
                background: '#2563eb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.15)',
                border: '4px solid #fff',
              }}
            >
              {/* SVG checkmark */}
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="12" fill="#2563eb" />
                <path
                  d="M7 13l3 3 7-7"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {/* Card */}
            <div
              style={{
                marginTop: 32,
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                padding: '56px 32px 32px 32px',
                width: '100%',
                maxWidth: 384,
                textAlign: 'center',
              }}
            >
              <Text
                className="text-2xl font-bold text-gray-900 mb-2 mt-0"
                style={{ marginTop: 0, marginBottom: 8 }}
              >
                Verify your email address
              </Text>
              <Text
                className="text-base text-gray-500 mb-8 mt-0"
                style={{ marginTop: 0, marginBottom: 32 }}
              >
                Tap the button below to confirm your email address and finish
                setting up your account.
              </Text>
              <Button
                href={`http://localhost:3000/app/verification/verify-email?token=${token}`}
                className="w-full text-base font-semibold text-white bg-blue-600 rounded-lg no-underline"
                style={{
                  width: '100%',
                  backgroundColor: '#2563eb',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  padding: '14px 0',
                  textDecoration: 'none',
                  marginBottom: 28,
                  marginTop: 0,
                  border: 'none',
                }}
              >
                Verify Email
              </Button>
              <Text
                className="text-xs text-gray-400 mb-2 mt-0"
                style={{ marginTop: 0, marginBottom: 8 }}
              >
                If the button doesn't work, copy and paste this link into your
                browser:
              </Text>
              <Text
                className="text-xs text-gray-500 break-all mb-4 mt-0"
                style={{ marginTop: 0, marginBottom: 16 }}
              >
                {`http://localhost:3000/app/verification/verify-email?token=${token}`}
              </Text>
              <Text
                className="text-xs text-gray-300 mt-0"
                style={{ marginTop: 0 }}
              >
                If you did not request this, you can safely ignore this email.
              </Text>
            </div>
          </Section>
          {/* Footer */}
          <Section className="text-center mt-8">
            <Text className="text-xs text-gray-400 m-0">
              © 2025 MealBud. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
