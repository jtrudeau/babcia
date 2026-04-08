# Babcia 80th — Polanica Maze

Vite + React birthday maze. Local dev: `npm install` then `npm run dev`.

## Publish to GitHub Pages

This repo is set up for **project Pages**: `https://jtrudeau.github.io/babcia/`

1. Create the empty repo `jtrudeau/babcia` on GitHub (no README if you want a clean first push).
2. From **this folder** (`apps/babcia-80th`), if it is the repo root:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: Polanica Maze + GitHub Pages deploy"
   git remote add origin git@github.com:jtrudeau/babcia.git
   git branch -M main
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (not “Deploy from a branch”).
4. After the first workflow run finishes, open **Actions** to confirm **Deploy to GitHub Pages** succeeded. The site will be at the URL above.

`vite.config.js` sets `base` to `/babcia/` only when `GH_PAGES=1` (set in the workflow). Local `npm run dev` keeps `/` so assets load correctly.

If you rename the GitHub repo, update `repoName` in `vite.config.js` to match.
