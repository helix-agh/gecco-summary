import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// BASE_PATH is set in CI so the app works under https://<org>.github.io/gecco-summary/
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
