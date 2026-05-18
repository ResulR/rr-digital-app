# RR Digital App

> Nom temporaire — projet en phase **V1** (initialisation).

Application mobile iOS / Android premium destinée aux clients d'une agence digitale.
Une seule application multi-tenant : chaque entreprise cliente accède uniquement à son espace privé (dashboard, projets, activité, notifications, support, compte).

## Stack prévue

**Mobile**
- Expo
- React Native
- TypeScript
- Expo Router
- TanStack Query
- SecureStore

**Backend**
- Node.js + Express
- TypeScript
- PostgreSQL (migrations SQL brutes versionnées)
- Zod
- JWT (access token + refresh token)
- Seed PostgreSQL pour les données de démo

## Structure du monorepo

```
rr-digital-app/
├── mobile/   # Application Expo React Native
├── server/   # Backend Node / Express
└── package.json   # npm workspaces (racine)
```

Gestionnaire de packages : **npm** (workspaces).
Pas de Turborepo, pas de Nx, pas de Prisma, pas de Drizzle.

## Scripts racine

| Script | Action |
|---|---|
| `npm run dev:mobile` | Démarre l'app mobile |
| `npm run dev:server` | Démarre le backend |
| `npm run build:server` | Build le backend |
| `npm run lint` | Lint mobile + server |

## Mobile / Expo Go

Pour lancer l'application mobile depuis la racine du monorepo (validé sur iPhone avec Expo Go) :

```powershell
cd C:\Users\resul\Desktop\rr-digital-app
npm run start -w mobile -- --clear
```

Le flag `--clear` vide le cache Metro avant le démarrage — recommandé après un changement de dépendances ou en cas de comportement inattendu.

> Ne pas utiliser `npx expo start` depuis la racine : cela peut ignorer le contexte npm workspace et provoquer des incompatibilités de version SDK.

## Statut

Phase **V1** — structure de monorepo initialisée, aucune dépendance installée, aucun code applicatif encore présent.
