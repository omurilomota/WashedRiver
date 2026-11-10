import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// O MARÉ PODRE precisa de duas coisas do build:
//  1. um único arquivo HTML (abre com duplo clique, é o que o itch.io quer);
//  2. `base: './'` para o bundle funcionar em qualquer subpasta (Pages, itch, pen drive).
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // O repo sempre tem testes; a flag só evita que o primeiro commit do
    // scaffolding (que ainda não tem tests/) trave o hook de pre-commit.
    // A CI exige a existência dos arquivos de teste explicitamente.
    passWithNoTests: true,
  },
});
