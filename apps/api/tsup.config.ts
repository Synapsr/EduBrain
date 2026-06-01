import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // On garde les dépendances tierces externes (présentes dans node_modules au
  // runtime) — évite de bundler des paquets CJS (dotenv…) en ESM, ce qui casse
  // sur les `require()` dynamiques de modules Node natifs.
  skipNodeModulesBundle: true,
  // …mais on bundle les paquets internes du monorepo, qui exportent du
  // TypeScript source (esbuild les compile). `noExternal` prime sur le skip.
  noExternal: [/^@edubrain\//],
});
