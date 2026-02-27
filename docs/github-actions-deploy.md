# GitHub Actions Deploy Guide

This repository now includes a frontend deploy workflow:

- Workflow file: `.github/workflows/deploy-frontend-pages.yml`
- Trigger: push to `main` (when `frontend/**` changes) or manual run
- Target: GitHub Pages

## 1) Enable GitHub Pages

1. Open repository `Settings > Pages`.
2. Set `Source` to `GitHub Actions`.

## 2) Set Repository Variables (optional but recommended)

Open `Settings > Secrets and variables > Actions > Variables` and add:

- `REACT_APP_BASE_PATH`
  - Project Pages example: `/P6ix-groupware/`
  - Custom domain/root example: `/`
- `REACT_APP_API_BASE`
  - Example: `https://api.example.com/api`
  - Default if omitted: `/api`
- `VITE_WS_BASE`
  - Example: `wss://api.example.com/ws`
  - Optional

If `REACT_APP_BASE_PATH` is not set, the workflow uses `/<repository-name>/` automatically.

## 3) Deploy

Push to `main` or run the workflow manually from the `Actions` tab:

- `Deploy Frontend to GitHub Pages`

## Notes

- This workflow deploys the `frontend` app only.
- SPA fallback is handled by creating `build/404.html` from `build/index.html`.
- Backend (Django) deployment usually requires server SSH/CD setup and is not included in this workflow.
