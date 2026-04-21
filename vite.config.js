import { defineConfig } from 'vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  plugins: [
    monacoEditorPlugin.default({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html']
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
  }
})