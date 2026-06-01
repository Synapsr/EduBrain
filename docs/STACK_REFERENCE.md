# EduBrain MVP — Authoritative Build Reference

> French sovereign AI assistant for teachers. Monorepo: Next.js 16 (web) + Hono (api) + AI SDK 5 + Drizzle/pgvector + Albert API.
> Compiled 2026-06-01. **Critical pin warning:** npm `latest` for the `ai` family has moved to **AI SDK 6**. A bare `npm i ai` installs v6 (LanguageModelV3). This MVP targets **AI SDK 5** — pin every `ai` / `@ai-sdk/*` package explicitly (see the table) or your custom provider and stream-part shapes will not match.

---

## 1. Consolidated dependency versions

Versions are point-in-time (2026-06-01) "latest on the targeted line" and will drift — re-verify with `npm view <pkg> version` at install. **Use caret ranges that hold the major line** (e.g. `^5`, `^2`, `^1`) to avoid jumping to AI SDK 6.

### `apps/api` (Hono backend — AI SDK 5)

| Package | Version | Range to pin | Notes |
|---|---|---|---|
| `ai` | 5.0.193 | `^5.0.193` | v5 line (dist-tag `ai-v5`). `latest`=6.0.193. Install via `ai@ai-v5` if needed. Peer: `zod ^3.25.76 \|\| ^4.1.8`. |
| `@ai-sdk/provider` | 2.0.3 | `^2.0.3` | Exports `LanguageModelV2*` types. v6 = 3.x. |
| `@ai-sdk/provider-utils` | 3.0.25 | `^3.0.25` | Helper utils used by `ai@5.x`. v6 = 4.x. |
| `@ai-sdk/openai-compatible` | 1.0.39 | `^1.0.39` | Albert provider (OpenAI-compatible). `latest`=2.0.48 (v6). |
| `@ai-sdk/anthropic` | 2.0.80 | `^2.0.80` | Optional (real provider). |
| `@ai-sdk/openai` | 2.0.106 | `^2.0.106` | Optional. |
| `@ai-sdk/gateway` | 2.0.94 | `^2.0.94` | Bundled by `ai@5.x`; enables string model IDs. |
| `hono` | 4.12.23 | `^4.12.23` | Node >= 18.14.1 effective. |
| `@hono/node-server` | 2.0.4 | `^2.0.4` | **Major v2** — `serve({ fetch, port })`. |
| `@hono/zod-validator` | 0.8.0 | `^0.8.0` | Peer: `hono >=4.10.0`, `zod ^3.25 \|\| ^4`. |
| `hono-rate-limiter` | 0.5.3 | `^0.5.3` | Pre-1.0, community. `keyGenerator` required. |
| `zod` | 4.4.3 (or `^3.25.76`) | pick one | AI SDK peers accept both; pick **one** project-wide. |
| `drizzle-orm` | 0.45.2 | `^0.45.2` | Exports `vector()` + distance helpers. |
| `drizzle-kit` | 0.31.10 | `^0.31.10` (dev) | CLI `generate/migrate/push`. |
| `postgres` (postgres.js) | 3.4.9 | `^3.4.9` | Recommended driver. Ships own types. |
| `pg` (alt driver) | 8.21.0 | `^8.21.0` | Use **only** if not using postgres.js. |
| `@types/pg` | 8.20.0 | `^8.20.0` (dev) | Only with `pg`. |
| `dotenv` | latest | — | Env loading. |
| `tsx` | latest | — (dev) | Migration/dev runner. |

### `apps/web` (Next.js 16 frontend)

| Package | Version | Range to pin | Notes |
|---|---|---|---|
| `next` | 16.2.6 | `^16.2.6` | App Router default. Turbopack default. |
| `react` | 19.2.6 | `^19.2.6` | App Router runs a bundled React **canary** internally. |
| `react-dom` | 19.2.6 | `^19.2.6` | Match `react`. |
| `tailwindcss` | 4.3.0 | `^4.3.0` | CSS-first; no `tailwind.config.js` needed. |
| `@tailwindcss/postcss` | 4.3.0 | `^4.3.0` | Lockstep with `tailwindcss`. |
| `postcss` | latest | — | Required by the plugin. |
| `ai` | 5.0.193 | `^5.0.193` | **Pin to v5** to match the api. (Research showed 6.0.193 as `latest` — do NOT use it here.) |
| `@ai-sdk/react` | 2.0.195 | `^2.0.195` | `useChat` for v5. `latest`=3.0.195 (v6). Peer: `react ^18 \|\| 19.x`. |

### Infrastructure (Docker / Postgres extension)

| Component | Version / Tag | Notes |
|---|---|---|
| Postgres + pgvector image | `pgvector/pgvector:pg17` (pin `0.8.2-pg17`) | `pg18-bookworm` available; pg17 = production-stable choice. |
| pgvector extension | 0.8.2 | `vector` type, HNSW/IVFFlat indexes, distance operators. |
| Albert API engine (OpenGateLLM) | 0.4.5 | Hosted instance not separately versioned; tracks engine. |

---

## 2. AI SDK 5 server streaming — Hono endpoint

Canonical wiring: read `UIMessage[]` from the client → `convertToModelMessages` → `streamText` → return the native `Response` from `toUIMessageStreamResponse()` (Hono passes a native `Response` straight through — do **not** wrap it).

```ts
// apps/api/src/routes/chat.ts
import { Hono } from 'hono';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { albert } from '../provider'; // see §4

const chat = new Hono();

chat.post('/api/chat', async (c) => {
  // useChat (DefaultChatTransport) sends UIMessage[] + any extra body fields.
  const { messages, conversationId, frameworkId } = await c.req.json<{
    messages: UIMessage[];
    conversationId?: string;
    frameworkId?: string;
  }>();

  const result = streamText({
    model: albert(process.env.ALBERT_CHAT_MODEL ?? 'openweight-small'),
    system: frameworkId ? `Réponds dans le cadre ${frameworkId}.` : undefined,
    // BREAKING v5: UIMessages have `parts`, not `content`. Must convert first.
    messages: convertToModelMessages(messages),
    // v5 renamed maxTokens -> maxOutputTokens
    // maxOutputTokens: 2048,
  });

  // streamText is SYNCHRONOUS (no await); it streams in the background.
  // toUIMessageStreamResponse() is the v5 replacement for v4 toDataStreamResponse().
  return result.toUIMessageStreamResponse({
    originalMessages: messages, // preserve ids/metadata
    onFinish: ({ messages }) => {
      // persist full conversation here (e.g. write to Drizzle)
      void conversationId;
    },
    onError: (err) => (err instanceof Error ? err.message : 'stream error'),
  });
});

export default chat;
```

Full server bootstrap (secure headers + CORS locked to the web origin + rate limiting + graceful shutdown):

```ts
// apps/api/src/index.ts
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono-rate-limiter';
import chat from './routes/chat';

const app = new Hono();

app.use('*', secureHeaders()); // helmet equivalent; CSP has NO default — add if needed

app.use(
  '/api/*',
  cors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // requires an explicit (non-'*') origin
  }),
);

app.use(
  '/api/*',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    // keyGenerator is REQUIRED — there is no default; omitting it throws.
    keyGenerator: (c) => getConnInfo(c).remote.address ?? 'unknown',
  }),
);

app.route('/', chat);
app.get('/', (c) => c.text('EduBrain API'));

const server = serve(
  { fetch: app.fetch, port: Number(process.env.PORT ?? 8787) },
  (info) => console.log(`API on http://localhost:${info.port}`),
);

process.on('SIGINT', () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => server.close(() => process.exit(0)));
```

---

## 3. Custom mock `LanguageModelV2` provider (echo/stub that streams)

Fully offline, no API key. Drop into `streamText({ model: echoModel })`. Key v5 facts encoded here: `specificationVersion: 'v2'` (lowercase), `content` is an **array** of parts, three-phase text streaming `text-start → text-delta(delta) → text-end` (NOT v4's flat `textDelta`), usage uses `inputTokens/outputTokens/totalTokens`.

```ts
// apps/api/src/providers/echo.ts
import type {
  LanguageModelV2,
  LanguageModelV2StreamPart,
  LanguageModelV2CallOptions,
} from '@ai-sdk/provider';

function lastUserText(options: LanguageModelV2CallOptions): string {
  const msgs = options.prompt; // already ModelMessages at the provider layer
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role === 'user') {
      return m.content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');
    }
  }
  return '';
}

export const echoModel: LanguageModelV2 = {
  specificationVersion: 'v2', // lowercase 'v2' — what the runtime checks
  provider: 'echo',
  modelId: 'echo-v1',
  supportedUrls: {},

  async doGenerate(options) {
    const text = lastUserText(options);
    return {
      content: [{ type: 'text', text }], // ARRAY of content parts (not a string)
      finishReason: 'stop',
      usage: { inputTokens: text.length, outputTokens: text.length, totalTokens: text.length * 2 },
      warnings: [],
    };
  },

  async doStream(options) {
    const text = lastUserText(options);
    const tokens = text.match(/\S+\s*/g) ?? [text];
    const id = 'txt-0';

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });
        controller.enqueue({ type: 'text-start', id });
        for (const tok of tokens) {
          await new Promise((r) => setTimeout(r, 30)); // simulate latency
          controller.enqueue({ type: 'text-delta', id, delta: tok }); // `delta`, not `textDelta`
        }
        controller.enqueue({ type: 'text-end', id });
        controller.enqueue({
          type: 'finish',
          finishReason: 'stop',
          usage: { inputTokens: text.length, outputTokens: text.length, totalTokens: text.length * 2 },
        });
        controller.close();
      },
    });

    return { stream };
  },
};

// Factory matching the provider convention:
export function createEcho() {
  return { languageModel: (_id: string) => echoModel };
}
```

Test-only alternative using the SDK's built-in mock (confirms the exact stream-part shape):

```ts
import { MockLanguageModelV2, simulateReadableStream } from 'ai/test';

const model = new MockLanguageModelV2({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'text-start', id: 'text-1' },
        { type: 'text-delta', id: 'text-1', delta: 'Hello' },
        { type: 'text-delta', id: 'text-1', delta: ', world!' },
        { type: 'text-end', id: 'text-1' },
        { type: 'finish', finishReason: 'stop', usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 } },
      ],
    }),
  }),
});
```

---

## 4. `@ai-sdk/openai-compatible` setup for Albert (chat + embeddings)

Albert is OpenAI-compatible (`/v1` + `Authorization: Bearer`), so it maps cleanly onto `createOpenAICompatible`. **Do not hardcode model IDs** — they are env-configurable and should be resolved at runtime (see §8).

```ts
// apps/api/src/provider.ts
// npm i ai@^5 @ai-sdk/openai-compatible@^1
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { embed } from 'ai';

export const albert = createOpenAICompatible({
  name: 'albert',
  baseURL: process.env.ALBERT_BASE_URL ?? 'https://albert.api.etalab.gouv.fr/v1',
  apiKey: process.env.ALBERT_API_KEY, // -> Authorization: Bearer <key>
  includeUsage: true, // surface token usage on streamed chat
});

// Chat -> POST {baseURL}/chat/completions
export const chatModel = albert(process.env.ALBERT_CHAT_MODEL ?? 'openweight-small');

// Embeddings -> POST {baseURL}/embeddings
// (single embedding model on Albert; dimension is env-configurable, see §7/§8)
export const embeddingModel = albert.textEmbeddingModel(
  process.env.ALBERT_EMBED_MODEL ?? 'openweight-embeddings',
);

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding; // length must equal EMBEDDING_DIM
}
```

> Caveat: the embedding factory method is `textEmbeddingModel(...)` in v5 docs; some pages also reference `embeddingModel(...)`. Verify against the installed `@ai-sdk/openai-compatible@1.0.39` types.

---

## 5. `useChat` (v5) client with a custom transport → Hono API

For the **v5** line use `@ai-sdk/react@^2` + `DefaultChatTransport` from `ai`. v5 `useChat` does **not** manage the input field (no `handleInputChange`/`handleSubmit`) — own it with `useState`. Render `message.parts` (filter `type === 'text'`).

```tsx
// apps/web/components/Chat.tsx
'use client';
// npm i @ai-sdk/react@^2 ai@^5
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export function Chat({ conversationId, frameworkId }: { conversationId: string; frameworkId: string }) {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787/api/chat',
      headers: { Authorization: `Bearer ${getToken()}` },
      // Use the callback (not a static `body`) — a static body can be captured STALE
      // (vercel/ai #7819, #7109).
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages, conversationId, frameworkId },
      }),
    }),
    onError: (err) => console.error('chat error', err),
  });

  return (
    <div className="mx-auto max-w-md p-4">
      {messages.map((m) => (
        <div key={m.id} className="mb-2">
          <strong>{m.role === 'user' ? 'Vous' : 'IA'} : </strong>
          {m.parts.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
        </div>
      ))}

      {error && (
        <div>
          <span>Une erreur est survenue.</span>
          <button onClick={() => regenerate()}>Réessayer</button>
        </div>
      )}

      {(status === 'submitted' || status === 'streaming') && <button onClick={() => stop()}>Stop</button>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="w-full rounded-card border p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== 'ready'} // status: 'ready' | 'submitted' | 'streaming' | 'error'
          placeholder="Posez votre question..."
        />
      </form>
    </div>
  );
}

function getToken() { return 'TOKEN'; }
```

> `NEXT_PUBLIC_` env vars are inlined at **build** time and frozen per build. The API base URL must be set before `next build`. `.env*` files stay at the **project root** even with a `src/` dir.

---

## 6. Tailwind v4 — CSS-first `@theme` tokens + dark mode

v4 is CSS-first: a single `@import "tailwindcss"` (no `@tailwind base/components/utilities`, no autoprefixer/postcss-import). `@theme` tokens generate utilities **and** emit CSS variables. v4 replaces `darkMode: 'class'` with the `@custom-variant` directive.

```css
/* apps/web/app/globals.css */
@import "tailwindcss";

/* Class-based dark mode (replaces v3 darkMode:'class') */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Brand (oklch recommended in v4) */
  --color-brand-50: oklch(0.97 0.02 256);
  --color-brand-500: oklch(0.62 0.19 256);
  --color-brand-600: oklch(0.55 0.20 256);
  --color-brand-900: oklch(0.30 0.12 256);

  /* Semantic tokens (light defaults) */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.18 0.01 256);

  /* Typography / shape / motion */
  --font-display: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 0.75rem;
  --shadow-card: 0 1px 3px rgb(0 0 0 / 0.1);
  --animate-fade-in: fade-in 0.3s ease-out;

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}

/* Override the underlying VARIABLES under .dark (plain block, NOT @theme —
   utilities like bg-background already point at var(--color-background)). */
.dark {
  --color-background: oklch(0.18 0.01 256);
  --color-foreground: oklch(0.97 0.01 256);
}
/* Usage: <div class="bg-background text-foreground font-display">
          <button class="bg-brand-500 hover:bg-brand-600 rounded-card shadow-card"> */
```

```js
// apps/web/postcss.config.mjs — the ONLY PostCSS config needed for v4
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

```tsx
// apps/web/app/layout.tsx — import globals.css once in the root layout
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "EduBrain", description: "Assistant IA souverain" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-background text-foreground font-display">{children}</body>
    </html>
  );
}
```

> To avoid FOUC with class-based dark mode, set the `dark` class via an inline `<head>` script reading `localStorage` before hydration. Data-attribute alternative: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` toggled with `<html data-theme="dark">`.

---

## 7. Drizzle + pgvector — schema, similarity search, config

The embedding column dimension **must be env-driven** because Albert's embedding dimension is not publicly confirmed (likely 1024 — verify empirically, §8). Match the HNSW index op-class to the distance function you query with (`vector_cosine_ops` ↔ `cosineDistance`/`<=>`).

```ts
// apps/api/src/db/schema.ts
import { index, pgTable, serial, text, vector } from 'drizzle-orm/pg-core';

// Set EMBEDDING_DIM after probing Albert (default 1024). dimensions is required.
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM ?? 1024);

export const guides = pgTable(
  'guides',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    url: text('url').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIM }),
  },
  (table) => [
    // HNSW for cosine distance (<=>). Op class MUST match the query distance fn.
    index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
    // L2:   .op('vector_l2_ops')  (<->)
    // IP:   .op('vector_ip_ops')  (<#>)
  ],
);
```

```ts
// apps/api/src/db/index.ts — postgres.js driver (recommended)
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle({ client, schema });
```

```ts
// apps/api/src/db/search.ts — ANN similarity search
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { db } from './index';
import { guides } from './schema';

// Threshold + readable similarity (similarity = 1 - cosineDistance, range [-1,1]).
export async function findSimilarGuides(queryEmbedding: number[]) {
  const similarity = sql<number>`1 - (${cosineDistance(guides.embedding, queryEmbedding)})`;
  return db
    .select({ name: guides.title, url: guides.url, similarity })
    .from(guides)
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(4);
}

// Canonical ANN form: ORDER BY distance ASC + LIMIT k — most likely to use the HNSW index.
export async function topK(queryEmbedding: number[], k = 5) {
  return db
    .select({ id: guides.id, title: guides.title, distance: cosineDistance(guides.embedding, queryEmbedding) })
    .from(guides)
    .orderBy(cosineDistance(guides.embedding, queryEmbedding))
    .limit(k);
}
```

```ts
// apps/api/drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**Migration workflow** (drizzle-kit does NOT auto-emit `CREATE EXTENSION vector` — enable it first):

```bash
# 1. Enable the extension via a hand-written custom migration (run BEFORE the table migration)
npx drizzle-kit generate --custom --name=enable_pgvector
#    -> edit drizzle/XXXX_enable_pgvector.sql, add:  CREATE EXTENSION IF NOT EXISTS vector;

# 2. Generate the schema migration (table + vector column + HNSW index)
npx drizzle-kit generate

# 3. Apply all pending migrations
npx drizzle-kit migrate

# Solo/prototype only: npx drizzle-kit push  (must CREATE EXTENSION vector manually first)
```

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg17   # pin 0.8.2-pg17 for reproducibility
    restart: unless-stopped
    shm_size: 1g                    # helps parallel HNSW index builds
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports: ['5432:5432']
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
```

---

## 8. Albert API facts

| Fact | Status | Value / Guidance |
|---|---|---|
| Base URL | **Confirmed** | `https://albert.api.etalab.gouv.fr/v1` (OpenAI-compatible, `/v1` is live and auth-gated — `GET /v1/models` returns 401 without a key). SecNumCloud-hosted, HTTPS. |
| Auth | **Confirmed** | `Authorization: Bearer <API_KEY>` on every request (OpenAPI `HTTPBearer`). Swap `api_key` + `base_url` on any OpenAI client. |
| Obtaining a key | **Confirmed** | French State public-sector agents only. Form: `https://albert.sites.beta.gouv.fr/access/` (or via ALLiaNCE `https://ia.numerique.gouv.fr`). ~24h, emailed back. No self-service signup. |
| Chat model IDs | **Aliases confirmed, backends not** | `openweight-small` / `openweight-medium` / `openweight-large` (legacy `albert-small`==small, `albert-large`==large still resolve). One concrete underlying ID seen: `openai/gpt-oss-120b`. No code-specialized models. **Treat as env-configurable.** |
| Model discovery | **Confirmed** | `GET /v1/models` → `{ data: [{ id, type, aliases }] }`. `type` gates endpoints: `text-generation`→chat, `text-embeddings-inference`→embeddings, `text-classification`→rerank, `automatic-speech-recognition`→transcriptions, `image-to-text`→ocr. **Resolve IDs at runtime; do not hardcode.** |
| Embedding model ID | **Confirmed** | `openweight-embeddings` (alias `embeddings-small`). Single embedding model. |
| Embedding dimension | **UNCONFIRMED** | Likely **1024** (legacy backends `intfloat/multilingual-e5-large` & `BGE-M3` are 1024-d), but Etalab says details are "not public". **Must be env-configurable (`EMBEDDING_DIM`, default 1024). Probe empirically before creating the `vector(N)` column.** |
| RAG / collections | **Confirmed available** | Managed RAG (Albert hosts the vector store). `POST /v1/collections`, `POST /v1/documents` (server-side chunk ~1024 / overlap 100 + auto-embed), `POST /v1/search` (`method`: `semantic`/`lexical`/`hybrid`, `k`, `collections`/`collection_ids` **integers**, `score_threshold`, `web_search`), `POST /v1/rerank` (`openweight-rerank` / alias `rerank-small`), `POST /v1/ocr`. **Decision point:** use managed collections, or use only `/v1/embeddings` + your own pgvector (§7) for full control. |
| Transcription | **Endpoint confirmed, model ID not** | `POST /v1/audio/transcriptions` (multipart `file`, `model`, `language="fr"`, `response_format`, `temperature`). Likely a `whisper-large-v3` variant (also `voxtral-mini-2507` documented). **Resolve the `automatic-speech-recognition` model from `/v1/models` at runtime; make it an env var.** |

**Runtime probes** (run once with your key to lock in env values):

```ts
// Probe embedding dimension -> set EMBEDDING_DIM before creating the vector column
import { embedText } from './provider';
console.log('EMBEDDING_DIM =', (await embedText('dimension probe')).length); // expect ~1024

// Resolve ASR model id (GET /v1/models, type === 'automatic-speech-recognition')
const res = await fetch(`${process.env.ALBERT_BASE_URL}/models`, {
  headers: { Authorization: `Bearer ${process.env.ALBERT_API_KEY}` },
});
const asr = (await res.json()).data.find((m: any) => m.type === 'automatic-speech-recognition');
console.log('ALBERT_ASR_MODEL =', asr?.id);
```

**Required env vars (driven by Albert uncertainty):**

```bash
ALBERT_BASE_URL=https://albert.api.etalab.gouv.fr/v1
ALBERT_API_KEY=...                       # obtained via access request (~24h)
ALBERT_CHAT_MODEL=openweight-small       # verify via /v1/models
ALBERT_EMBED_MODEL=openweight-embeddings
ALBERT_ASR_MODEL=                        # resolve at runtime (type=automatic-speech-recognition)
EMBEDDING_DIM=1024                        # PROBE & CONFIRM before sizing vector(N)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
WEB_ORIGIN=http://localhost:3000
PORT=8787
NEXT_PUBLIC_API_URL=http://localhost:8787/api/chat   # web; inlined at build time
```

---

## 9. Decisions & assumptions

1. **Pin to AI SDK 5, not 6.** npm `latest` is AI SDK 6 (`ai@6.0.193`, `@ai-sdk/react@3.x`, `@ai-sdk/provider@3.x` / LanguageModelV3). This MVP uses v5 (`ai@^5`, `@ai-sdk/react@^2`, `@ai-sdk/provider@^2` / LanguageModelV2). One research agent reported v6 versions for the Next.js web app — **overridden**: pin the web app to the same v5 line as the api to keep `useChat` and stream protocol consistent. The text stream shape (`text-start/delta/end + finish`) is identical across v5/v6; only the provider major and React-binding major differ.
2. **`specificationVersion: 'v2'` is lowercase.** A doc render showed `'V2'`; the runtime constant/`MockLanguageModelV2` use lowercase. Use `'v2'`.
3. **`convertToModelMessages` is called synchronously.** Docs were inconsistent (Promise vs sync); all canonical route-handler examples call it synchronously. Treat sync as canonical for v5.
4. **Albert embedding dimension is unconfirmed → env-configurable.** Default `EMBEDDING_DIM=1024`, but **must** be probed empirically before creating the `vector(N)` column/index (column size cannot change without a migration).
5. **All Albert model IDs are env-configurable and resolved at runtime via `/v1/models`.** Chat aliases (`openweight-*`) and the ASR model can change; only the embedding alias and base URL/auth are stable.
6. **RAG approach is a deliberate decision, not yet fixed.** Either (a) Albert managed collections (`/v1/search`), or (b) self-hosted pgvector via `/v1/embeddings`. This reference scaffolds (b) for full control; the decision hinges partly on the unconfirmed embedding dimension.
7. **Driver choice: postgres.js** (lightweight, ships own types) over `node-postgres`. The `pg` rows in the table are alternatives only — install one driver, not both.
8. **Zod: pick one major project-wide.** `@hono/zod-validator@0.8.0` and AI SDK 5 peers accept both Zod 3 (`>=3.25`) and Zod 4 (`4.4.3`); some libs still pin Zod 3 — check peer-dep conflicts before adopting Zod 4.
9. **Rate-limiter key from `getConnInfo()`**, not a raw `x-forwarded-for` header (spoofable unless behind a trusted proxy). `keyGenerator` is required — omitting it throws. Default store is in-memory per-process; add an `unstorage`-backed store (Redis) for multi-instance deployments.
10. **Hono returns the AI SDK `Response` directly** — confirmed pattern; do not wrap in `c.body()`/`stream()` (that would drop status/headers). Those helpers are only for manually-built streams.
11. **`@hono/node-server` is major v2** — use `serve({ fetch, port })`, not `serve(app, { port })`.
12. **Versions are point-in-time (2026-06-01)** and drift. Pin in `package.json`; re-verify with `npm view <pkg> version` at install.