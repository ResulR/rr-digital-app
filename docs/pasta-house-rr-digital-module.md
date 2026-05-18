# Pasta House x RR Digital App — Module restaurant

## 1. Vue d'ensemble

```
Mobile RR Digital App
  → Backend RR Digital App  (JWT utilisateur + company access + module access)
    → API interne Pasta House  (X-Internal-Token)
      → Base de données Pasta House
```

**Principes fondamentaux :**

- Le mobile ne parle **jamais** directement à Pasta House.
- Les tokens internes (`X-Internal-Token`) restent exclusivement côté serveur RR Digital.
- Pasta House expose des routes internes dédiées, protégées par un token partagé.
- RR Digital backend expose des routes protégées par JWT utilisateur + vérification d'accès company + vérification du module actif.
- Aucun champ Stripe (session, payment intent) n'est exposé via ces routes.

---

## 2. Repositories concernés

| Repository | Rôle |
|------------|------|
| `ResulR/rr-digital-app` | Backend Node/Express + mobile Expo |
| `ResulR/pasta-house` | API e-commerce Pasta House (source de vérité des commandes) |

---

## 3. Modules DB RR Digital

La table `company_modules` liste les modules actifs par entreprise.

| Clé module | Accès accordé |
|------------|---------------|
| `restaurant_orders` | Liste des commandes, détail commande, changement de statut |
| `restaurant_schedule` | Horaires semaine, fermetures exceptionnelles, horaires spéciaux, statut restaurant, activation/désactivation des commandes en ligne |

La vérification est faite dans chaque route RR Digital via `hasActiveModule(companyId, moduleKey)`.

---

## 4. Variables d'environnement — RR Digital App (serveur)

Noms uniquement, jamais les valeurs :

| Variable | Usage |
|----------|-------|
| `PASTA_HOUSE_INTERNAL_API_BASE_URL` | URL de base de l'API interne Pasta House |
| `PASTA_HOUSE_INTERNAL_TOKEN` | Token partagé envoyé dans l'en-tête `X-Internal-Token` |
| `PASTA_HOUSE_COMPANY_ID` | UUID de l'entreprise Pasta House autorisée à utiliser le module |

`PASTA_HOUSE_COMPANY_ID` est comparé au `companyId` de la route pour s'assurer que l'intégration est configurée pour la bonne entreprise.

---

## 5. Variable d'environnement — Pasta House (serveur)

| Variable | Usage |
|----------|-------|
| `RR_DIGITAL_INTERNAL_TOKEN` | Token attendu dans `X-Internal-Token` pour authentifier les appels RR Digital |

---

## 6. Routes Pasta House internes

Toutes les routes sont préfixées `/api/internal/rr-digital/` et protégées par le middleware `requireInternalToken` (vérifie `X-Internal-Token`).

### GET /api/internal/rr-digital/orders

- **Rôle :** Récupère la liste des commandes
- **Sécurité :** `X-Internal-Token`
- **Query params optionnels :** `date=today`, `status=<statut>`, `limit=<n>`
- **Réponse :** `{ ok: true, data: { orders: [...] } }`
- Les champs Stripe (`stripe_checkout_session_id`, `stripe_payment_intent_id`) sont **exclus** de la réponse

### GET /api/internal/rr-digital/orders/:id

- **Rôle :** Récupère le détail d'une commande (client, articles, totaux, adresse)
- **Sécurité :** `X-Internal-Token`
- **Réponse :** `{ ok: true, data: { order: {...} } }`
- Aucun champ Stripe exposé

### PATCH /api/internal/rr-digital/orders/:id/status

- **Rôle :** Change le statut d'une commande
- **Sécurité :** `X-Internal-Token`
- **Body :** `{ "status": "<nouveau_statut>" }`
- **Statuts acceptés :** `preparing`, `ready`, `in_delivery`, `completed`, `cancelled`
- **Réponse :** `{ ok: true, data: { order: {...} } }` (commande mise à jour)
- Écrit dans `order_status_history` avec `changed_by_admin_id = NULL` et `note = "Changed via RR Digital App"`
- Certains statuts déclenchent des emails côté Pasta House après commit

### GET /api/internal/rr-digital/schedule

- **Rôle :** Expose l'état complet des horaires et du statut restaurant
- **Sécurité :** `X-Internal-Token`
- **Réponse :** `{ ok: true, data: { openingHours, closures, overrides, storeStatus, storeAvailability } }`
- Calcule `storeAvailability` (isOpen, reason, message) à partir des horaires et des réglages

### PATCH /api/internal/rr-digital/schedule/orders-enabled

- **Rôle :** Active ou désactive les commandes en ligne
- **Sécurité :** `X-Internal-Token`
- **Body :** `{ "ordersEnabled": true|false, "reason": "<texte>" | null }`
- Met à jour `site_settings.orders_enabled` et `orders_disabled_reason`
- **Réponse :** `{ ok: true, data: { storeStatus, storeAvailability } }`

---

## 7. Routes RR Digital backend

Toutes les routes passent par la chaîne de sécurité :
`requireAuth` → `requireCompanyAccess` → `hasActiveModule` → `isIntegrationConfigured`

### GET /api/companies/:companyId/restaurant-orders

- **Module requis :** `restaurant_orders`
- **Rôle :** Proxy vers `GET /api/internal/rr-digital/orders`
- **Query params transmis :** `date`, `status`, `limit`

### GET /api/companies/:companyId/restaurant-orders/:orderId

- **Module requis :** `restaurant_orders`
- **Rôle :** Proxy vers `GET /api/internal/rr-digital/orders/:id`

### PATCH /api/companies/:companyId/restaurant-orders/:orderId/status

- **Module requis :** `restaurant_orders`
- **Rôle :** Proxy vers `PATCH /api/internal/rr-digital/orders/:id/status`
- **Validation Zod :** `status` doit être une valeur de `RestaurantWritableStatus`

### GET /api/companies/:companyId/restaurant-schedule

- **Module requis :** `restaurant_schedule`
- **Rôle :** Proxy vers `GET /api/internal/rr-digital/schedule`

### PATCH /api/companies/:companyId/restaurant-schedule/orders-enabled

- **Module requis :** `restaurant_schedule`
- **Rôle :** Proxy vers `PATCH /api/internal/rr-digital/schedule/orders-enabled`
- **Validation Zod :** `ordersEnabled: boolean`, `reason: string | null` (max 200 caractères)

---

## 8. Écrans mobiles

| Fichier | Rôle |
|---------|------|
| `mobile/app/(tabs)/management.tsx` | Affiche les modules actifs de l'entreprise sélectionnée ; les modules `restaurant_orders` et `restaurant_schedule` sont cliquables |
| `mobile/app/restaurant-orders/index.tsx` | Liste des commandes avec filtres horizontaux (Aujourd'hui, Toutes récentes, En préparation, Prêtes, En livraison, Terminées, Annulées) |
| `mobile/app/restaurant-orders/[orderId].tsx` | Détail d'une commande : résumé (statut, mode, total, date), actions statut, client (nom/téléphone/email/adresse), articles, total |
| `mobile/app/restaurant-schedule.tsx` | Statut restaurant (ouvert/fermé), toggle activation commandes, services (livraison/retrait/rush), horaires semaine, fermetures exceptionnelles, horaires spéciaux |

Le mobile utilise exclusivement `authenticatedRequest` (depuis `AuthContext`) — jamais de `fetch` direct.

---

## 9. Statuts commandes

### Tous les statuts possibles

| Statut | Signification |
|--------|---------------|
| `pending` | Commande créée, paiement non lancé |
| `awaiting_payment` | Session Stripe ouverte |
| `paid` | Paiement confirmé par webhook Stripe |
| `preparing` | En cuisine |
| `ready` | Prête (retrait ou livraison) |
| `in_delivery` | En cours de livraison |
| `completed` | Livrée ou retirée |
| `cancelled` | Annulée |
| `payment_failed` | Échec de paiement |

### Statuts modifiables depuis RR Digital App

`preparing`, `ready`, `in_delivery`, `completed`, `cancelled`

### Règles

- `pending`, `awaiting_payment`, `paid`, `payment_failed` ne sont **pas modifiables** manuellement depuis l'app.
- Le statut `in_delivery` est **interdit** pour les commandes en retrait (`fulfillmentMethod = 'pickup'`).
- Chaque changement de statut est enregistré dans `order_status_history` avec `changed_by_admin_id = NULL` et `note = "Changed via RR Digital App"`.
- Certains changements de statut déclenchent l'envoi d'emails clients côté Pasta House (après commit DB).

---

## 10. Horaires et commandes activées

### Lecture du schedule (`GET /schedule`)

Agrège les données depuis :
- `opening_hours` — horaires hebdomadaires par jour
- `exceptional_closures` — fermetures ponctuelles (plages de dates)
- `schedule_overrides` — horaires spéciaux par date de service
- `site_settings` — `orders_enabled`, `orders_disabled_reason`, `rush_mode_enabled`
- `delivery_settings` — `delivery_enabled`, `pickup_enabled`

`storeAvailability` (isOpen, reason, message) est calculé dynamiquement à partir de ces données en tenant compte du fuseau Europe/Brussels.

### Activation/désactivation des commandes

- `orders_enabled = false` bloque la création de nouvelles commandes côté API Pasta House (checkout).
- Les commandes **déjà passées** ne sont pas impactées.
- Depuis le mobile RR Digital, **désactiver** envoie `reason = "Pause temporaire"`.
- **Réactiver** envoie `reason = null` (la colonne `orders_disabled_reason` est remise à `''` en base — contrainte NOT NULL).
- Mise à jour locale immédiate côté mobile après réponse serveur (pas d'attente d'un rechargement complet).

---

## 11. Tests utiles

### RR Digital App

```bash
# Build TypeScript serveur
npm run build -w server

# Vérification types mobile
npm run typecheck -w mobile

# Vérification espaces blancs git
git diff --check

# Statut working tree
git status
```

### Pasta House

```bash
npm run build
npm test
git diff --check
git status
```

### Tests fonctionnels mobiles (golden path)

1. Onglet **Gestion** → module "Commandes restaurant" → liste filtrée "Aujourd'hui"
2. Appuyer sur une commande → détail → bouton action statut → confirmation Alert → statut mis à jour
3. Onglet **Gestion** → module "Horaires restaurant" → état restaurant visible
4. Bouton "Désactiver les commandes" → confirmation → état mis à jour immédiatement
5. Bouton "Activer les commandes" → confirmation → état mis à jour immédiatement
6. Pull-to-refresh sur chaque écran

---

## 12. Dépannage rapide

| Symptôme | Piste |
|----------|-------|
| Module non visible dans l'onglet Gestion | Vérifier `company_modules` dans la DB RR Digital — la ligne `(companyId, 'restaurant_orders')` ou `(companyId, 'restaurant_schedule')` doit exister avec `status = 'active'` |
| Erreur 503 `INTEGRATION_NOT_CONFIGURED` | Vérifier que `PASTA_HOUSE_COMPANY_ID` correspond exactement au `companyId` de la requête, et que `PASTA_HOUSE_INTERNAL_API_BASE_URL` + `PASTA_HOUSE_INTERNAL_TOKEN` sont renseignés dans le `.env` RR Digital |
| Erreur 401 côté Pasta House | Le token `X-Internal-Token` envoyé par RR Digital ne correspond pas à `RR_DIGITAL_INTERNAL_TOKEN` côté Pasta House — vérifier la cohérence des deux `.env` |
| Le mobile ne voit pas le dernier code déployé | `git pull` + éventuellement `expo start --clear` pour vider le cache Metro |
| Push SSH vers VPS échoue | Vérifier `~/.ssh/config` et que la deploy key est bien attachée au repository GitHub |
| Erreur 400 `INVALID_STATUS_TRANSITION` | Le statut demandé n'est pas autorisé depuis l'état actuel de la commande côté Pasta House |

---

## 13. Historique des steps d'implémentation

| Step | Scope | Description |
|------|-------|-------------|
| Step 8A | Pasta House | `PATCH /api/internal/rr-digital/orders/:id/status` — changement de statut commande |
| Step 8B | RR Digital backend | Gateway `PATCH /api/companies/:companyId/restaurant-orders/:orderId/status` |
| Step 8C | Mobile | Écran détail commande avec actions statut (`restaurant-orders/[orderId].tsx`) |
| Step 9A | Pasta House | `GET /api/internal/rr-digital/schedule` — lecture horaires et statut restaurant |
| Step 9B | RR Digital backend | Gateway `GET /api/companies/:companyId/restaurant-schedule` |
| Step 9C | Mobile | Écran horaires restaurant en lecture seule (`restaurant-schedule.tsx`) |
| Step 9D-A | Pasta House | `PATCH /api/internal/rr-digital/schedule/orders-enabled` — activation/désactivation commandes |
| Step 9D-B | RR Digital backend | Gateway `PATCH /api/companies/:companyId/restaurant-schedule/orders-enabled` |
| Step 9D-C | Mobile | Toggle activation/désactivation commandes dans l'écran horaires |
| Step QA-1 | Mobile | Passe de finition UX : traduction statuts, accents, suppression label "Lecture seule", constantes de couleur |
