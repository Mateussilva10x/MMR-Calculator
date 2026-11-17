import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em GitHub Pages o app fica em /MMR-Calculator/.
// Em Vercel/Netlify/dev fica na raiz.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/MMR-Calculator/' : '/',
  plugins: [react()],
})
