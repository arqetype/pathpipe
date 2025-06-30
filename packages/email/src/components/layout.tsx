import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import React from 'react';
import tailwindConfig from '../tailwind';

type EmailLayoutProps = {
  children: React.ReactNode;
  previewMessage?: string;
};

export function Layout({ children, previewMessage }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Tailwind config={tailwindConfig}>
        <Body
          style={{
            fontFamily:
              '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
          }}
        >
          {previewMessage && <Preview>{previewMessage}</Preview>}
          <Container>
            <Section>
              <Img
                src="https://mealbud.ai/logo.png"
                alt="Mealbud.ai Logo"
                width="130"
                height="50"
                className="bg-gray-100"
              />
            </Section>
            {children}
            <Hr />
            <Section>
              <Text className="text-gray-500 text-sm">
                <Link
                  href="https://mealbud.ai"
                  className="underline text-primary"
                >
                  Mealbud.ai
                </Link>
                , your AI-powered meal planning assistant.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
