<div align="center">

# 🧠 EduBrain

**The sovereign, open-source AI teaching assistant — for teachers.**

Connected to **Albert API**, the French State's generative-AI gateway (DINUM) · Self-hostable · GDPR · Accessible · Frugal

[![CI](https://github.com/Synapsr/EduBrain/actions/workflows/ci.yml/badge.svg)](https://github.com/Synapsr/EduBrain/actions/workflows/ci.yml)
[![License: EUPL-1.2](https://img.shields.io/badge/License-EUPL--1.2-1d4ed8.svg)](LICENSE)
[![Node ≥ 20.9](https://img.shields.io/badge/Node-%E2%89%A5%2020.9-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Albert API · DINUM](https://img.shields.io/badge/Albert%20API-DINUM-000091)](https://albert.api.etalab.gouv.fr)

[Français](README.md) · **English**

</div>

> 🇫🇷 EduBrain is a French public-service project; its product UI is in French. This page is a courtesy translation — [`README.md`](README.md) is the source of truth.

---

EduBrain helps teachers **prepare lessons, differentiate, generate exercises and query their documents** — while keeping data in France. The EduBrain server calls **Albert API**; the browser only talks to the EduBrain server.

> **What is Albert API?** The French State's sovereign generative-AI *gateway* (DINUM's instance of [OpenGateLLM](https://github.com/etalab-ia/OpenGateLLM), **OpenAI-compatible**): a single, France-hosted entry point to **open-weight models** (Mistral, Llama…). It is an **API, not a model** — the "AI" is the models behind it.

> 🟢 **Runs out of the box, no Albert key required.** Without a key, a *mock provider* streams real responses (a "demo mode" banner shows in the UI). You can install and test everything end-to-end in a minute.

## Features

- **💬 Chat** — streamed responses, sanitized Markdown, multi-conversation, model selector (small by default, for frugality).
- **🧭 Usage Frameworks** (*Cadres d'usage*) — *the differentiating feature*. Shape the AI's behavior (subject, level, persona, tone, do / don't rules); the framework is compiled into a system prompt + guardrails and applied to a conversation.
- **📎 Sourced RAG** — drop a document (PDF, `.txt`, `.md`) into the chat or a framework: the AI answers **with cited passages** (embeddings + pgvector).
- **🎓 Student spaces** *(phase-2 preview, fictional data)* — an access link opens a class **under a framework**; the teacher supervises read-only.
- **🔒 Sovereign & accessible** — Albert key strictly server-side, no trackers, logs free of personal content, accessibility-first (French RGAA).

## Getting started

**Requirements:** Node ≥ 20.9 · pnpm ≥ 10 (`corepack enable`) · Docker (for PostgreSQL + pgvector).

```bash
pnpm install   # install the monorepo
pnpm setup     # create .env, start Postgres+pgvector, migrate and seed (idempotent)
pnpm dev       # web → http://localhost:3000   ·   api → http://localhost:8787
```

Open **http://localhost:3000**: a badge shows "API connected" and "Demo mode". API health: **http://localhost:8787/health**.

> 🐳 **No Docker?** Point `DATABASE_URL` at any PostgreSQL with the **pgvector** extension, then `pnpm db:migrate && pnpm db:seed`.

## Architecture

A **pnpm + Turborepo** monorepo. The EduBrain API (Hono) holds the Albert API key and all AI logic; the frontend (Next.js) only talks to it.

```
Browser ── useChat (AI SDK 5) ─▶ apps/web (Next.js 16, Tailwind v4)
                                      │  fetch (CORS locked in dev)
                                      ▼
                            apps/api (Hono · Node)
                              ├─ Albert API key (never client-side)
                              ├─ POST /api/chat → streamText().toUIMessageStreamResponse()
                              ├─ /api/frameworks   · Usage Frameworks
                              ├─ /api/documents    · RAG
                              ├─ /api/accesses     · student spaces
                              └─ Drizzle ─▶ PostgreSQL + pgvector
```

| Package | Role |
|---|---|
| `apps/web` | Teacher UI — Next.js 16, React 19, Tailwind v4, AI SDK 5 (`useChat`) |
| `apps/api` | AI logic, RAG, Frameworks — Hono, holds the Albert key, streaming |
| `packages/core` | Shared types · env validation (Zod) · framework compilation · RAG · FR strings |
| `packages/db` | Drizzle ORM · schema · migrations · client (PostgreSQL + pgvector) |
| `packages/config` | Shared strict TypeScript presets |

**AI provider:** `ai` (AI SDK 5) + `@ai-sdk/openai-compatible`. With `ALBERT_API_KEY` → Albert API; otherwise → local **mock**. Models and base URL are environment-configurable. Details: [`docs/STACK_REFERENCE.md`](docs/STACK_REFERENCE.md).

## Configuration

All variables are documented in [`.env.example`](.env.example) and **validated at startup** (Zod: fail fast and clear). The main ones:

| Variable | Role | Default |
|---|---|---|
| `ALBERT_API_KEY` | Albert API key — **empty ⇒ demo mode**. Server only. | _(empty)_ |
| `ALBERT_BASE_URL` | Albert API's OpenAI-compatible endpoint | `https://albert.api.etalab.gouv.fr/v1` |
| `ALBERT_CHAT_MODEL_SMALL` / `_LARGE` | Chat models (small by default) | `openweight-small` / `openweight-large` |
| `ALBERT_EMBEDDING_MODEL` | Embedding model (RAG) | `openweight-embeddings` |
| `ALBERT_EMBEDDING_DIM` | pgvector dimension (probe with a key) | `1536` |
| `DATABASE_URL` | PostgreSQL + pgvector | `postgres://edubrain:edubrain@localhost:5432/edubrain` |
| `API_PORT` / `WEB_ORIGIN` | API port / allowed CORS origin | `8787` / `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | API base called by the browser | `http://localhost:8787` |

### Connecting a real Albert API key

1. **Get a key** — Albert API is reserved for French public-sector agents; request access via [albert.sites.beta.gouv.fr/access](https://albert.sites.beta.gouv.fr/access/).
2. Set `ALBERT_API_KEY` in `.env` (never committed).
3. **Check available models:** `GET ${ALBERT_BASE_URL}/models` (Bearer), then adjust `ALBERT_CHAT_MODEL_*`.
4. **Probe the embedding dimension** (not public): embed a string, measure the vector length, update `ALBERT_EMBEDDING_DIM` **before** creating the `vector(N)` column.
5. Restart the API: the "demo mode" banner gives way to "Albert connected".

## Commands

| Command | Effect |
|---|---|
| `pnpm dev` | Run web + api (Turborepo, watch) |
| `pnpm setup` | Bootstrap: `.env` + database + migrations + seed |
| `pnpm build` | Production build (web + api) |
| `pnpm typecheck` | TypeScript check (all targets) |
| `pnpm lint` · `lint:fix` | Biome (lint + format) |
| `pnpm test` | Vitest tests |
| `pnpm db:migrate` · `db:seed` · `db:studio` | Migrations · seed · Drizzle explorer |
| `docker compose up -d` · `down` | Start / stop PostgreSQL + pgvector |

**Quality gate** (same as CI) — must be green at every milestone:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Sovereign deployment

Built to be **self-hostable on sovereign infrastructure** (SecNumCloud-grade), with **no non-EU proprietary dependency** and no lock-in:

- **API** — `pnpm --filter @edubrain/api build` → `apps/api/dist/index.js` (Node ≥ 20), run as `NODE_ENV=production` behind a TLS reverse proxy.
- **Web** — `pnpm --filter @edubrain/web build` then `… start` (Next.js Node server). Set `NEXT_PUBLIC_API_URL` **at build time**.
- **Database** — managed PostgreSQL with **pgvector**; run `pnpm db:migrate` on deploy.
- **Secrets** (Albert key, `DATABASE_URL`) via the platform's secret manager — never in the client bundle, never committed.

## Sovereignty & compliance

- **No student personal data** stored or sent; minimized teacher data (GDPR).
- **Albert API key strictly server-side** — never exposed to the client.
- **Frugality** — small model by default, usage (token) tracking, no needless calls.
- **No third-party analytics, no trackers**; structured logs (pino) free of personal content.
- **Accessibility (RGAA)** — keyboard focus, contrasts, ARIA, `prefers-reduced-motion`; hardened across milestones.

## Roadmap

| Milestone | Scope | Status |
|---|---|---|
| **M0** | Scaffolding (monorepo, strict TS, Biome, Zod env, pgvector, CI) | ✅ |
| **M1** | Chat core (Albert / mock, streaming, persistence, FR errors) | ✅ |
| **M2** | Usage Frameworks (compilation, CRUD, application) | ✅ |
| **M3** | RAG / documents (embeddings, pgvector, cited sources) | ✅ |
| **M4** | RGAA accessibility, speech→text, i18n, polish | ⏳ |
| **M5** | Hardening (rate limiting, security headers, e2e, docs) | ⏳ |

Detailed log, assumptions and TODO: [`PROGRESS.md`](PROGRESS.md) · Internal contributor guide: [`CLAUDE.md`](CLAUDE.md).

## License

© 2026 **Synapsr** · <contact@synapsr.io>

Distributed under the [**EUPL-1.2**](LICENSE) (European Union Public Licence), suited to the European public sector. You may use, modify and redistribute this software; any redistributed version must stay under the same open licence and **keep this author attribution**.
