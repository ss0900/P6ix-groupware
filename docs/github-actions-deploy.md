# GitHub Actions Deploy Guide

This repository now includes two deploy workflows:

- Workflow file: `.github/workflows/deploy-frontend-pages.yml`
- Trigger: push to `main` (when `frontend/**` changes) or manual run
- Target: GitHub Pages
- Workflow file: `.github/workflows/deploy-backend-ssh.yml`
- Trigger: push to `main` (when `backend/**` changes) or manual run
- Target: your server via SSH

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

## 3) Backend SSH Deploy Setup

Open `Settings > Secrets and variables > Actions`.

### Required secrets

- `BACKEND_SSH_HOST` (example: `10.0.0.12`)
- `BACKEND_SSH_USER` (example: `ubuntu`)
- `BACKEND_SSH_KEY` (private key text)
- `BACKEND_SSH_PORT` (optional, default `22`)

### Optional variables

- `BACKEND_APP_DIR`
  - Server path to repo root
  - Default: `/var/www/P6ix-groupware`
- `BACKEND_VENV_PATH`
  - Virtualenv path (relative to `BACKEND_APP_DIR` or absolute)
  - Default: `.venv`
- `BACKEND_RUN_COLLECTSTATIC`
  - `true` or `false`
  - Default: `false`
- `BACKEND_RESTART_COMMAND`
  - Example: `sudo systemctl restart p6ix-backend`
- `BACKEND_POST_DEPLOY_COMMAND`
  - Example: `sudo systemctl restart nginx`

Backend deploy workflow behavior:

- `git fetch/checkout/pull` on target branch
- `pip install -r backend/requirements.txt`
- `python backend/manage.py migrate --noinput`
- optional `collectstatic`
- optional service restart command(s)

## 4) Deploy

Push to `main` or run the workflow manually from the `Actions` tab:

- `Deploy Frontend to GitHub Pages`
- `Deploy Backend via SSH`

## Notes

- Frontend deploy uses GitHub Pages.
- SPA fallback is handled by creating `build/404.html` from `build/index.html`.
- Backend deploy requires your server to have Python/venv and repository access already set up.
