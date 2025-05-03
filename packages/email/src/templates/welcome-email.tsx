import React from "react";
import { Html } from "@react-email/components";

export const WelcomeEmail = ({ username }: { username: string }) => (
  <Html lang="fr">
    <h1>Bienvenue, {username} !</h1>
    <p>Merci de nous avoir rejoints.</p>
  </Html>
);
