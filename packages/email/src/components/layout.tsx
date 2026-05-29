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
          <Container className="max-w-lg mx-auto bg-card border border-border">
            {/* Header Section */}
            <Section className="bg-primary text-primary-foreground py-6 text-center">
              <Img
                src="https://pathpipe.com/logo.png"
                alt="Pathpipe Logo"
                width="130"
                height="50"
                className="mx-auto"
              />
            </Section>

            {/* Main Content */}
            <Section className="p-6">{children}</Section>

            {/* Footer Section */}
            <Hr className="mt-6 border-border" />
            <Section className="text-center">
              <Text className="text-sm text-muted-foreground">
                Need help? Contact our support team at{' '}
                <Link
                  href="mailto:support@pathpipe.cpù"
                  className="underline text-primary"
                >
                  support@pathpipe.com
                </Link>
                .
              </Text>
              <Text className="text-sm text-muted-foreground mt-2">
                Visit our{' '}
                <Link
                  href="https://pathpipe.com/help"
                  className="underline text-primary"
                >
                  Help Center
                </Link>{' '}
                for more information.
              </Text>
              <Text className="text-sm text-muted-foreground mt-4">
                <Link
                  href="https://pathpipe.com"
                  className="underline text-primary"
                >
                  Pathpipe
                </Link>{' '}
                - Your job tracker excel substitute.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
