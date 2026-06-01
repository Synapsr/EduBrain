<div align="center">

# 🧠 EduBrain

**L'assistant pédagogique IA, souverain et open source — pour les enseignants.**

Branché sur **Albert API**, la passerelle d'IA générative de l'État français (DINUM) · Auto-hébergeable · RGPD · Accessible (RGAA) · Frugal

[![CI](https://github.com/Synapsr/EduBrain/actions/workflows/ci.yml/badge.svg)](https://github.com/Synapsr/EduBrain/actions/workflows/ci.yml)
[![Licence : EUPL-1.2](https://img.shields.io/badge/Licence-EUPL--1.2-1d4ed8.svg)](LICENSE)
[![Node ≥ 20.9](https://img.shields.io/badge/Node-%E2%89%A5%2020.9-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Albert API · DINUM](https://img.shields.io/badge/Albert%20API-DINUM-000091)](https://albert.api.etalab.gouv.fr)

**Français** · [English](README.en.md)

</div>

---

EduBrain aide les enseignants à **préparer leurs cours, différencier, générer des exercices et interroger leurs documents** — en gardant les données en France. Le serveur EduBrain appelle **Albert API** ; le navigateur, lui, ne parle qu'au serveur EduBrain.

> **Albert API**, qu'est-ce que c'est ? La passerelle d'IA générative souveraine de l'État (instance DINUM d'[OpenGateLLM](https://github.com/etalab-ia/OpenGateLLM), **compatible OpenAI**) : un point d'accès unique et hébergé en France à des **modèles open-weight** (Mistral, Llama…). C'est une **API**, pas un modèle — l'IA, ce sont les modèles derrière.

> 🟢 **Fonctionne immédiatement, sans clé Albert.** En l'absence de clé, un *provider de simulation* prend le relais et streame de vraies réponses (bandeau « mode démo » dans l'UI). Vous installez et testez tout de bout en bout en une minute.

## Fonctionnalités

- **💬 Chat** — réponses en streaming, Markdown sûr, multi-conversations, sélecteur de modèle (petit par défaut, par frugalité).
- **🧭 Cadres d'usage** — *la fonctionnalité différenciante*. Encadrez le comportement de l'IA (matière, niveau, persona, ton, règles à faire / à ne pas faire) ; le Cadre est compilé en *system prompt* + garde-fous, appliqué à une conversation.
- **📎 RAG sourcé** — déposez un document (PDF, `.txt`, `.md`) dans le chat ou dans un Cadre : l'IA répond **avec les passages cités** (embeddings + pgvector).
- **🎓 Espaces élèves** *(préfiguration phase 2, données fictives)* — un lien d'accès ouvre une classe **sous un Cadre** ; l'enseignant supervise en lecture seule.
- **🔒 Souverain & accessible** — clé Albert strictement côté serveur, aucun tracker, logs sans contenu personnel, accessibilité RGAA.

## Démarrage

**Prérequis :** Node ≥ 20.9 · pnpm ≥ 10 (`corepack enable`) · Docker (pour PostgreSQL + pgvector).

```bash
pnpm install   # installe le monorepo
pnpm setup     # crée .env, démarre Postgres+pgvector, migre et seed (idempotent)
pnpm dev       # web → http://localhost:3000   ·   api → http://localhost:8787
```

Ouvrez **http://localhost:3000** : un badge indique « API connectée » et « Mode démo ». Santé de l'API : **http://localhost:8787/health**.

> 🐳 **Sans Docker ?** Pointez `DATABASE_URL` vers n'importe quel PostgreSQL doté de l'extension **pgvector**, puis `pnpm db:migrate && pnpm db:seed`.

## Architecture

Monorepo **pnpm + Turborepo**. L'API EduBrain (Hono) détient la clé Albert API et toute la logique IA ; le front (Next.js) ne parle qu'à elle.

```
Navigateur ── useChat (AI SDK 5) ─▶ apps/web (Next.js 16, Tailwind v4)
                                         │  fetch (CORS verrouillé en dev)
                                         ▼
                               apps/api (Hono · Node)
                                 ├─ clé Albert API (jamais côté client)
                                 ├─ POST /api/chat → streamText().toUIMessageStreamResponse()
                                 ├─ /api/frameworks   · Cadres d'usage
                                 ├─ /api/documents    · RAG
                                 ├─ /api/accesses     · espaces élèves
                                 └─ Drizzle ─▶ PostgreSQL + pgvector
```

| Paquet | Rôle |
|---|---|
| `apps/web` | UI enseignant — Next.js 16, React 19, Tailwind v4, AI SDK 5 (`useChat`) |
| `apps/api` | Logique IA, RAG, Cadres — Hono, détient la clé Albert, streaming |
| `packages/core` | Types partagés · validation d'env (Zod) · compilation des Cadres · RAG · chaînes FR |
| `packages/db` | Drizzle ORM · schéma · migrations · client (PostgreSQL + pgvector) |
| `packages/config` | Presets TypeScript stricts partagés |

**Provider IA** : `ai` (AI SDK 5) + `@ai-sdk/openai-compatible`. Avec `ALBERT_API_KEY` → Albert API ; sinon → **mock** local. Modèles et URL de base configurables par environnement. Détails : [`docs/STACK_REFERENCE.md`](docs/STACK_REFERENCE.md).

## Configuration

Toutes les variables sont documentées dans [`.env.example`](.env.example) et **validées au démarrage** (Zod : échec précoce et clair). Les principales :

| Variable | Rôle | Défaut |
|---|---|---|
| `ALBERT_API_KEY` | Clé Albert API — **vide ⇒ mode démo**. Serveur uniquement. | _(vide)_ |
| `ALBERT_BASE_URL` | Endpoint OpenAI-compatible d'Albert API | `https://albert.api.etalab.gouv.fr/v1` |
| `ALBERT_CHAT_MODEL_SMALL` / `_LARGE` | Modèles de chat (petit par défaut) | `openweight-small` / `openweight-large` |
| `ALBERT_EMBEDDING_MODEL` | Modèle d'embeddings (RAG) | `openweight-embeddings` |
| `ALBERT_EMBEDDING_DIM` | Dimension pgvector (à sonder avec une clé) | `1536` |
| `DATABASE_URL` | PostgreSQL + pgvector | `postgres://edubrain:edubrain@localhost:5432/edubrain` |
| `API_PORT` / `WEB_ORIGIN` | Port API / origine CORS autorisée | `8787` / `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Base API appelée par le navigateur | `http://localhost:8787` |

### Brancher la vraie clé Albert API

1. **Obtenir une clé** — Albert API est réservée aux agents du secteur public ; demande via [albert.sites.beta.gouv.fr/access](https://albert.sites.beta.gouv.fr/access/).
2. Renseigner `ALBERT_API_KEY` dans `.env` (jamais committée).
3. **Vérifier les modèles** disponibles : `GET ${ALBERT_BASE_URL}/models` (Bearer), puis ajuster `ALBERT_CHAT_MODEL_*`.
4. **Sonder la dimension d'embedding** (non publique) : embeddez une chaîne, mesurez la longueur du vecteur, mettez `ALBERT_EMBEDDING_DIM` à jour **avant** de créer la colonne `vector(N)`.
5. Redémarrez l'API : le bandeau « mode démo » cède la place à « Albert connecté ».

## Commandes

| Commande | Effet |
|---|---|
| `pnpm dev` | Lance web + api (Turborepo, watch) |
| `pnpm setup` | Bootstrap : `.env` + base + migrations + seed |
| `pnpm build` | Build de production (web + api) |
| `pnpm typecheck` | Vérification TypeScript (toutes cibles) |
| `pnpm lint` · `lint:fix` | Biome (lint + format) |
| `pnpm test` | Tests Vitest |
| `pnpm db:migrate` · `db:seed` · `db:studio` | Migrations · seed · explorateur Drizzle |
| `docker compose up -d` · `down` | Démarre / arrête PostgreSQL + pgvector |

**Gate qualité** (identique à la CI) — à passer au vert à chaque jalon :

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Déploiement souverain

Conçu pour être **auto-hébergeable sur infrastructure souveraine** (type SecNumCloud), **sans dépendance propriétaire non-UE** ni lock-in :

- **API** — `pnpm --filter @edubrain/api build` → `apps/api/dist/index.js` (Node ≥ 20), lancé en `NODE_ENV=production` derrière un reverse proxy TLS.
- **Web** — `pnpm --filter @edubrain/web build` puis `… start` (serveur Next.js Node). Définir `NEXT_PUBLIC_API_URL` **au build**.
- **Base** — PostgreSQL managé avec **pgvector** ; appliquer `pnpm db:migrate` au déploiement.
- **Secrets** (clé Albert, `DATABASE_URL`) via le gestionnaire de secrets de la plateforme — jamais dans le bundle client, jamais committés.

## Souveraineté & conformité

- **Aucune donnée personnelle d'élève** stockée ou envoyée ; minimisation des données enseignant (RGPD).
- **Clé Albert API strictement côté serveur** — jamais exposée au client.
- **Frugalité** — petit modèle par défaut, suivi de l'usage (tokens), pas d'appels inutiles.
- **Pas d'analytics tiers, pas de tracker** ; logs structurés (pino) sans contenu personnel.
- **Accessibilité RGAA** — focus clavier, contrastes, ARIA, `prefers-reduced-motion` ; durcie au fil des jalons.

## Feuille de route

| Jalon | Périmètre | État |
|---|---|---|
| **M0** | Échafaudage (monorepo, TS strict, Biome, env Zod, pgvector, CI) | ✅ |
| **M1** | Cœur chat (Albert / mock, streaming, persistance, erreurs FR) | ✅ |
| **M2** | Cadres d'usage (compilation, CRUD, application) | ✅ |
| **M3** | RAG / documents (embeddings, pgvector, sources citées) | ✅ |
| **M4** | Accessibilité RGAA, audio→texte, i18n, finition | ⏳ |
| **M5** | Durcissement (rate limiting, en-têtes sécurité, e2e, doc) | ⏳ |

Journal détaillé, hypothèses et TODO : [`PROGRESS.md`](PROGRESS.md) · Guide de contribution interne : [`CLAUDE.md`](CLAUDE.md).

## Licence

© 2026 **Synapsr** · <contact@synapsr.io>

Distribué sous [**EUPL-1.2**](LICENSE) (European Union Public Licence), adaptée au secteur public européen. Vous pouvez utiliser, modifier et redistribuer ce logiciel ; toute version redistribuée doit rester sous la même licence ouverte, en **conservant cette mention d'auteur**.
