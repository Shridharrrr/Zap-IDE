import { defineConfig } from 'vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    monacoEditorPlugin.default({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html']
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    })
  ],
  worker: {
    format: 'es'
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  optimizeDeps: {
    exclude: ['monaco-editor']
  },
})