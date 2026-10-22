# Open Core Security API

FastAPI backend for accounts, contact messages, CTF challenges/submissions, leaderboard, announcements, and admin operations.

## Local setup

Requires Python 3.11+.

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env: set DATABASE_URL (SQLite is supported for local development),
# JWT_SECRET to a long random value, and BOOTSTRAP_ADMIN_EMAIL.
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs and http://127.0.0.1:8000/health.

## Deploy on Render

1. Create a PostgreSQL database in Render and copy its **internal** connection URL.
2. In Render, choose New → Blueprint and select this repository. The root `render.yaml` defines the API service.
3. Set the API service's `DATABASE_URL` to the Render PostgreSQL internal URL, using SQLAlchemy's `postgresql+psycopg://` driver form.
4. Set `BOOTSTRAP_ADMIN_EMAIL` to the email address you will register with. Register that account once; on startup the matching account is promoted to admin.
5. Deploy. The API health endpoint is `/health`; interactive docs are at `/docs`.

Never commit a real `.env`, database URL, JWT secret, password, or CTF flag.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/contact`
- `GET /api/challenges`, `POST /api/challenges/{id}/submissions`
- `GET /api/leaderboard`, `GET /api/announcements`
- Admin bearer-token routes: `GET /api/admin/messages`, `GET /api/admin/members`, `POST /api/admin/challenges`, `DELETE /api/admin/challenges/{id}`, `POST /api/admin/announcements`

New users are members by default. Only the configured bootstrap account is promoted to admin. Challenge flags are SHA-256 hashed and never returned by the API. Passwords use Argon2id. Access tokens expire after 60 minutes by default.

## Important production notes

- Use a managed PostgreSQL database with backups. The SQLite default is for local development only.
- Configure rate limiting at the hosting edge before opening public registration/login and flag submission to the internet.
- Add Alembic migrations before changing production database schemas; the initial release creates missing tables on startup.
- The current challenge submission model permits one recorded attempt per user per challenge. Add attempt throttling and reset workflows before a public competition.
- Contact messages are stored for admin review; this API does not send email.
