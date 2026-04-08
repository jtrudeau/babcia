import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Must match the GitHub repo name for GitHub Pages project sites:
// https://<user>.github.io/<repo>/
const repoName = 'babcia'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GH_PAGES === '1' ? `/${repoName}/` : '/',
})
