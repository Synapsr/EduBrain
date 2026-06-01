#!/usr/bin/env node
// Bootstrap de développement en une commande : `pnpm setup`.
// - crée `.env` à partir de `.env.example` s'il manque ;
// - démarre PostgreSQL + pgvector (docker compose) ;
// - attend que la base soit saine ;
// - applique les migrations et le seed.
//
// Pré-requis : `pnpm install` déjà exécuté, et Docker en marche.

import { execSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const log = (msg) => console.log(`\x1b[36m[setup]\x1b[0m ${msg}`);
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

// 1. Fichier d'environnement
if (!existsSync(resolve(root, '.env'))) {
  copyFileSync(resolve(root, '.env.example'), resolve(root, '.env'));
  log('.env créé depuis .env.example (mode démo : aucune clé Albert requise).');
} else {
  log('.env déjà présent — conservé.');
}

// 2. Base de données
log('Démarrage de PostgreSQL + pgvector (docker compose)…');
run('docker compose up -d');

// 3. Attente de la santé du conteneur
log('Attente de la disponibilité de la base…');
const deadline = Date.now() + 60_000;
let healthy = false;
while (Date.now() < deadline) {
  const res = spawnSync(
    'docker',
    ['inspect', '--format', '{{.State.Health.Status}}', 'edubrain-postgres'],
    { cwd: root, encoding: 'utf8' },
  );
  if (res.stdout.trim() === 'healthy') {
    healthy = true;
    break;
  }
  // petite attente active sans bloquer indéfiniment
  spawnSync(process.execPath, ['-e', 'setTimeout(()=>{}, 1000)']);
}
if (!healthy) {
  console.error('\x1b[31m[setup] La base n’est pas devenue saine à temps.\x1b[0m');
  process.exit(1);
}
log('Base prête.');

// 4. Migrations + seed
log('Application des migrations…');
run('pnpm db:migrate');
log('Seed (enseignant démo + cadres)…');
run('pnpm db:seed');

log('Terminé ✅  Lancez maintenant : pnpm dev');
