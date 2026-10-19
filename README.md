# Dropz

Dropz rassemble chaque jour les rabais de boutiques québécoises et te les présente sous forme de cartes à swiper. Tu sauvegardes tes coups de cœur, tu filtres par catégorie et par taille, et tu vois l'historique des prix pour savoir si une aubaine en est vraiment une.

Site : https://dropz-brown.vercel.app

## Comment ça marche

- **Collecte** : `scripts/collect-deals.mjs` lit les catalogues publics des boutiques (en respectant leur `robots.txt`) et écrit `public/deals.json`, `public/price-history.json` et `public/meta.json`.
- **Automatisation** : le workflow GitHub Actions `update-deals.yml` lance la collecte tous les jours à 9 h UTC, enregistre les changements et peut redéployer le site sur Vercel.
- **Comptes** : Supabase gère la connexion et la synchronisation des favoris.
- **Statistiques** : seulement avec le consentement de la personne, et sans information personnelle.

## Technologies

Next.js, React, TypeScript, Tailwind CSS, Supabase.

## Lancer le projet en local

```bash
npm install
npm run dev
```

Ouvre ensuite http://localhost:3000.

La connexion à Supabase est configurée dans `app/lib/supabase.ts`.

## Mettre à jour les aubaines à la main

```bash
node scripts/collect-deals.mjs
```