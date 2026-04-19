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
} from 'react-email';
import React from 'react';
import tailwindConfig from '../tailwind';

type EmailLayoutProps = {
  children: React.ReactNode;
  previewMessage?: string;
};

export function Layout({ children, previewMessage }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Tailwind config={tailwindConfig}>
        <Head>
          <style>
            @import
            url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap');
          </style>
        </Head>
        <Body
          style={{
            fontFamily:
              '"Space Grotesk", -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
          }}
        >
          {previewMessage && <Preview>{previewMessage}</Preview>}
          <Container>
            <Section>
              <Img
                src="https://weareweaver.org/logo.png"
                alt="Weaver Logo"
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
                  href="https://weareweaver.org"
                  className="underline text-primary"
                >
                  Weaver
                </Link>
                , your AI-powered planning assistant.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
