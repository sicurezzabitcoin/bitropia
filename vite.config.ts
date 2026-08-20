import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sito statico, nessuna chiamata di rete a runtime: tutto il calcolo è client-side.
// Niente service worker/PWA: la versione pubblicata sta dietro il gatekeeper
// WordPress+EDD e il controllo accessi deve essere rieseguito a ogni visita.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    sourcemap: true,
  },
})
