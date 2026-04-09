# Babcia's Maze

A birthday maze game for Babcia's 80th. Navigate the fog as a chess knight, collect the family icons (Kasia, Julek, three Izzies), and unlock the gift. Each icon reveals a photo and a personal message. Completing the maze triggers confetti and a short fanfare.

Live at **https://jtrudeau.github.io/babcia/**

---

## Local development

```bash
npm install
npm run dev
```

## Deploy (GitHub Actions → GitHub Pages)

Push to `main` and the workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

On first setup: **GitHub → Settings → Pages → Source: GitHub Actions**.

> `vite.config.js` uses `base: /babcia/` only when `GH_PAGES=1` (set by the workflow). Local dev keeps `/`.  
> If you rename the repo, update `repoName` in `vite.config.js`.

## Photos

Drop family photos into `public/assets/` before pushing — they are not tracked in git:

| File | Used for |
| :--- | :--- |
| `kasia.png` | Kasia's memory card |
| `joel.jpg` | Julek's memory card |
| `izzie.png` | All three Izzie cards |
