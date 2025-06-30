# Mealbud.ai

Calorie counting, powered by AI. Minimal, extensible, and developer-first.

## ⚡️ Présentation

Mealbud est une application open-source en cours de développement permettant d 'estimer et de suivre ses apports caloriques à l 'aide de l 'intelligence artificielle. Pensé pour les développeurs et les makers, le projet vise la simplicité d 'architecture, la clarté du code, et l 'extensibilité. Mealbud est conçu comme un terrain d 'expérimentation autour de l 'IA appliquée à la nutrition.

🏗️ Architecture & Stack
• Monorepo orchestré par Turborepo
• TypeScript partout (frontend, backend, scripts)
• pnpm pour la gestion des packages
• Docker pour l 'environnement de développement reproductible ( docker-compose )
• Prettier pour la cohérence du code
• Node.js >= 20 requis

## 🧑‍💻 Environnement de développement

Le workflow de développement est pensé pour être plug-and-play grâce à Docker et Turborepo :
• Frontend : lancé sur http://localhost:3000
• Backend API : lancé sur http://localhost:4000
• Serveur d 'emails de dev (MailDev) : disponible sur le port 1080 pour la réception des emails envoyés par l 'application
• Prévisualisation des emails : interface web sur http://localhost:1081 pour consulter les emails de test

L'ensemble des services est démarré et arrêté automatiquement via les scripts pnpm run dev.

## Scripts principaux (package.json )

• pnpm run dev : démarre tous les services de développement (frontend, backend, serveurs d 'emails)
• pnpm run build : build multi-packages via Turbo
• pnpm run test : lance les tests unitaires
• pnpm run lint : linter sur l'ensemble du repo
• pnpm run format : formatage automatique
• pnpm run check-types : vérification stricte des types TypeScript

## 🧠 Fonctionnalités prévues

• Analyse automatique des repas (texte ou image) pour estimation calorique
• Suggestions personnalisées basées sur l 'historique utilisateur
• API modulaire pour intégrer d 'autres outils (trackers, dashboards…)
• Authentification (à venir)
• UI épurée et accessible

## 🚀 Démarrage

1.  Cloner le repo

    ```bash
    git clone https://github.com/arqetype/mealbud-ai.git
    cd mealbud-ai
    ```

2.  Installer les dépendances

    ```bash
    pnpm install
    ```

    Si vous n'avez pas pnpm, installez-le avec :

    ```bash
    npm install -g pnpm
    ```

3.  Lancer l'environnement de dev
    ```bash
    pnpm run dev
    ```

Note : nécessite Docker installé et Node.js >= 20.

## 🌱 Contribuer

Ce projet est ouvert à toutes les contributions (features, refacto, docs). Forkez, proposez des PRs ou ouvrez des issues pour discuter des idées.

## 📚 Inspirations & objectifs

Mealbud s'inspire des outils qui rendent la tech agréable à utiliser : structure claire, conventions explicites, et plaisir du code. L 'objectif : concevoir un socle solide pour explorer l 'IA appliquée à la nutrition, tout en gardant la porte ouverte à l 'expérimentation.

Fait avec passion par Arqetype. 🇫🇷 Made in France.
