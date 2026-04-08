import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// eslint-disable-next-line no-undef
const isGhPages = process.env.GH_PAGES === '1'

// Must match the GitHub repo name for GitHub Pages project sites:
// https://<user>.github.io/<repo>/
const repoName = 'babcia'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isGhPages ? `/${repoName}/` : '/',
})
