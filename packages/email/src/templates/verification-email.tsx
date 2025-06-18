import React from "react";
import { Html, Head, Body, Container, Section, Text, Button } from "@react-email/components";

interface VerificationEmailProps {
  token: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({ token }) => (
  <Html lang="fr">
    <Head>
      <title>Vérifiez votre e-mail</title>
    </Head>
    <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', margin: 0, padding: 0 }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        <Section style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>Bienvenue sur MealBud !</Text>
        </Section>
        <Section style={{ marginBottom: '20px' }}>
          <Text style={{ fontSize: '16px', color: '#555' }}>
            Merci de vérifier votre adresse e-mail pour compléter votre inscription.
          </Text>
        </Section>
        <Section style={{ textAlign: 'center' }}>
          <Button
            href={`http://localhost:3000/app/verify-email?token=${token}`}
            style={{
              backgroundColor: '#4CAF50',
              color: '#ffffff',
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Vérifier l'e-mail
          </Button>
        </Section>
        <Section style={{ marginTop: '20px', textAlign: 'center' }}>
          <Text style={{ fontSize: '12px', color: '#999' }}>
            Si vous ne vous êtes pas inscrit à MealBud, veuillez ignorer cet e-mail.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
