# Open Core Security

A responsive React + Vite website and FastAPI backend for an independent, community-driven cybersecurity initiative.

## Frontend
```bash
npm install
npm run dev
npm run build
```

## Backend
See [backend/README.md](backend/README.md) for local setup, API documentation, and Render deployment.

The backend provides member accounts, contact-message storage, CTF challenge management and flag submissions, leaderboard scoring, announcements, and admin-only management endpoints. It runs separately from GitHub Pages and requires an API host and PostgreSQL for production.

## GitHub Pages
Settings → Pages → Source: GitHub Actions. The included workflow publishes the Vite `dist/` directory.

## Security and status
- Passwords are hashed with Argon2id; API sessions use expiring JWTs.
- Challenge flags are stored as SHA-256 hashes and never exposed in API responses.
- Admin routes require an admin bearer token.
- Operation: Blackout remains a proposed concept, not a scheduled or open event.
- Before public launch, configure rate limiting, database backups, migrations, and review deployment environment variables.
