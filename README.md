# Track Your Budget

A full-stack personal finance tracker: sign in with Google, GitHub or Microsoft, record income and expenses, and see where the current month's money went. The UI is in German.

---

## Features

- **Social sign-in** via Google, GitHub or Microsoft (OAuth 2.0 authorization-code flow, exchanged server-side).
- **Dashboard** for the current month: balance, income and expense cards, a three-month income/expense bar chart, expenses by category, and the eight most recent transactions grouped by month.
- **Transactions page**: the full history, ten rows at a time with "load more", grouped by month, with filters for category, income/expense and period (current month, last two months) plus a debounced search over title and notes.
- **Add, edit and delete** transactions from either page; every write shows a success or error toast.
- **Profile page** showing the account and the avatar pulled from the sign-in provider.
- **Settings page** with quick templates, thresholds and scheduled entries. These tabs are UI prototypes: their state lives in the browser only and is not sent to the API.
- **Per-user data**: every query is scoped to the authenticated user.

---

## Tech Stack

### Frontend (`app-frontend/`)

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI |
| Vite | Build tool and dev server |
| React Router 7 | Client-side routing |
| Tailwind CSS v4 + shadcn/ui (Radix) | Styling and components |
| Recharts | Monthly chart |
| react-hook-form | Transaction forms |
| Axios | API client with silent token refresh |
| Prettier + ESLint | Formatting and linting |

### Backend (`backend/`)

| Technology | Purpose |
|---|---|
| Django 6 + Django REST Framework | API |
| djangorestframework-simplejwt | Access and refresh tokens |
| django-allauth + dj-rest-auth | Social login (Google, GitHub, Microsoft) |
| PostgreSQL | Database |
| django-cors-headers | CORS |
| Gunicorn | Production WSGI server |

---

## Project Structure

```
track-your-budget/
├── app-frontend/
│   ├── src/
│   │   ├── App.tsx                  # Routes + auth guard
│   │   ├── Dashboard.tsx            # Current-month overview
│   │   ├── Transactions.tsx         # Paginated, filterable history
│   │   ├── Profile.tsx / Settings.tsx / Login.tsx
│   │   ├── components/
│   │   │   ├── auth/                # Provider buttons, RequireAuth
│   │   │   ├── budget/              # Cards, chart, list, filters, modals
│   │   │   ├── layout/              # Navbar, PageHeader
│   │   │   ├── profile/ settings/ transactions/
│   │   │   └── ui/                  # shadcn components (generated)
│   │   ├── hooks/
│   │   │   ├── use-auth-session.ts  # Token bootstrap, OAuth exchange, logout
│   │   │   ├── use-transaction-mutations.ts
│   │   │   └── use-transaction-details.ts
│   │   └── lib/
│   │       ├── api/transactions.ts  # All transaction / summary requests
│   │       ├── apiClient.ts         # Axios instance + refresh interceptor
│   │       ├── auth/                # Social login call, OAuth callback capture
│   │       ├── format.ts            # Currency, date and category labels
│   │       ├── transaction-filters.ts
│   │       └── types.ts
│   ├── Dockerfile                   # Vite build → nginx, proxies /api to backend
│   └── docker-entrypoint.sh         # Writes env-config.js at container start
├── backend/
│   ├── api/
│   │   ├── models.py                # Transaction, Profile
│   │   ├── serializers.py
│   │   ├── signals.py               # Creates Profile + fetches provider avatar
│   │   ├── urls.py
│   │   ├── views/
│   │   │   ├── auth.py              # Google/GitHub/Microsoft login views
│   │   │   ├── transactions.py      # List/filter/paginate, create, update, delete
│   │   │   ├── summary.py           # Monthly totals for the chart
│   │   │   ├── users.py             # /users/me/
│   │   │   └── health.py            # Kubernetes probe
│   │   └── tests.py
│   ├── backend/settings.py
│   └── seed_september_transactions.py
├── docker-compose.yml
└── azure-pipelines.yml
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- Python 3.12+
- PostgreSQL
- OAuth apps for at least one of Google, GitHub or Microsoft

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DJANGO_SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Where providers send the browser back after login (must match the
# redirect_uri registered with each provider and used in the VITE_*_LINK URLs).
FRONTEND_URL=http://localhost:5173

# Optional; the origin of FRONTEND_URL is always allowed.
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Set to True behind HTTPS so the refresh cookie is marked Secure.
JWT_AUTH_SECURE=False

POSTGRES_DB=budget_tracker
POSTGRES_USER=budget
POSTGRES_PASSWORD=secret
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API listens on `http://localhost:8000`.

### 2. Register the OAuth providers

Provider credentials are **not** environment variables. They are allauth `SocialApp` rows:

1. Open `http://localhost:8000/admin/` → **Social applications** → **Add**.
2. Pick the provider (Google, GitHub or Microsoft), paste its client ID and secret, and attach the site with `SITE_ID = 1`.
3. In the provider's console, register `FRONTEND_URL` as the redirect URI.

A login attempt for a provider without a `SocialApp` row returns a JSON `503` and the UI shows "Der Anmeldedienst … ist auf dem Server nicht eingerichtet."

### 3. Frontend

```bash
cd app-frontend
npm install
```

Create `app-frontend/.env.local` with the **full authorization URL** of each provider you configured. A button is hidden when its variable is empty.

```env
VITE_GOOGLE_LINK=https://accounts.google.com/o/oauth2/v2/auth?client_id=…&redirect_uri=http://localhost:5173&response_type=code&scope=openid%20email%20profile
VITE_GITHUB_LINK=https://github.com/login/oauth/authorize?client_id=…&redirect_uri=http://localhost:5173&scope=read:user%20user:email
VITE_MICROSOFT_LINK=https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=…&redirect_uri=http://localhost:5173&response_type=code&scope=openid%20email%20profile%20User.Read
```

```bash
npm run dev
```

The app runs on `http://localhost:5173`. The Vite dev server proxies `/api` to `http://127.0.0.1:8000`, so no CORS setup is needed locally.

### 4. Sample data (optional)

Edit `USERNAME` in `backend/seed_september_transactions.py`, then:

```bash
python manage.py shell < seed_september_transactions.py
```

---

## Development

| Task | Command |
|---|---|
| Frontend dev server | `npm run dev` |
| Type-check + production build | `npm run build` |
| Lint | `npm run lint` |
| Format / check formatting | `npm run format` / `npm run format:check` |
| Backend tests | `python manage.py test api` |
| Backend system check | `python manage.py check` |

Prettier is configured in `app-frontend/.prettierrc` (single quotes, no semicolons, 100 columns). The generated `src/components/ui` folder is excluded from formatting.

---

## API

All endpoints live under `/api/`. Authenticated endpoints expect `Authorization: Bearer <access>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health/` | No | Liveness/readiness probe |
| POST | `/google/login/`, `/github/login/`, `/microsoft/login/` | No | Exchange `{ "code": … }` for an access token; sets the refresh cookie |
| POST | `/token/refresh/` | Cookie | Rotate the refresh cookie and return a new access token |
| POST | `/auth/logout/` | Cookie | Blacklist the refresh token and clear the cookie |
| GET | `/users/me/` | Yes | Current user with avatar URL and bio |
| GET | `/transactions/` | Yes | List transactions (see query parameters below) |
| POST | `/transactions/` | Yes | Create a transaction |
| PUT | `/transactions/<id>/` | Yes | Update a transaction |
| DELETE | `/transactions/<id>/` | Yes | Delete a transaction |
| GET | `/monthly-summary/` | Yes | Income and expense totals for the last three months |

### `GET /transactions/` query parameters

| Parameter | Effect |
|---|---|
| `category` | Exact match on the category value |
| `type` | `income` or `expense` |
| `search` | Case-insensitive substring match on title or notes |
| `date_from`, `date_to` | Inclusive `YYYY-MM-DD` bounds; malformed values return `400` |
| `limit`, `offset` | Opt-in pagination; `limit` is capped at 100 |

Without `limit` the response is a plain array, which the dashboard uses for the current month. With `limit` the response is a page:

```json
{ "count": 137, "next": "…?limit=10&offset=10", "previous": null, "results": [ … ] }
```

Rows are ordered by date descending, then id descending, so pages never overlap on same-day entries.

### Transaction shape

```json
{
  "id": 42,
  "title": "Supermarkt",
  "notes": "Wocheneinkauf",
  "amount": 62.35,
  "category": "lebensmittel",
  "date": "2026-09-18",
  "type": "expense"
}
```

`amount` is always positive; the sign comes from `type`.

| Category value | Label |
|---|---|
| `gehalt` | Gehalt (Salary) |
| `miete` | Miete (Rent) |
| `lebensmittel` | Lebensmittel (Groceries) |
| `transport` | Transport |
| `unterhaltung` | Unterhaltung (Entertainment) |
| `versicherung` | Versicherung (Insurance) |
| `sonstiges` | Sonstiges (Miscellaneous) |

---

## Authentication Flow

```
User clicks "Continue with <Provider>"
  → Button stores the provider name in sessionStorage and redirects to VITE_<PROVIDER>_LINK
  → Provider redirects back to FRONTEND_URL?code=…
  → oauth-callback.ts captures the code before React renders and strips it from the URL
  → useAuthSession POSTs { code } to /api/<provider>/login/
  → Backend exchanges the code with the provider using the SocialApp secret
  → Backend returns an access token in the body and sets the httpOnly "jwt-refresh" cookie
  → Access token is kept in memory only; every request sends it as a Bearer header
  → On 401, apiClient refreshes via /api/token/refresh/ once and replays queued requests
  → If the refresh fails, the session is cleared and the router redirects to /login
```

- Access tokens live **5 minutes**, refresh tokens **4 days**. Refresh tokens rotate on use and the old one is blacklisted.
- The refresh token never reaches JavaScript; it is an httpOnly, `SameSite=Lax` cookie. Nothing is stored in localStorage.
- On first login a `Profile` is created and the provider's avatar is downloaded into `MEDIA_ROOT/user_<id>/`.

---

## Running with Docker Compose

```bash
docker compose up --build
```

Compose reads its variables from a `.env` file next to `docker-compose.yml` (`DJANGO_SECRET_KEY`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`). The frontend container serves the built SPA on `http://localhost:3000` and proxies `/api`, `/media`, `/admin` and `/static` to the backend service. Provider links are injected at container start through `VITE_GOOGLE_LINK`, `VITE_GITHUB_LINK` and `VITE_MICROSOFT_LINK`, which the entrypoint writes into `env-config.js`, so the image does not need a rebuild per environment.

---

## CI/CD

`azure-pipelines.yml` runs on pushes and pull requests to `main` and `test`:

1. **Test & Lint**: `npm run lint` for the frontend, `manage.py check` and `manage.py test` for the backend.
2. **Build & Push**: on `test` and `main` only, both Docker images are built and pushed to Docker Hub tagged with the build id (`main` also updates `latest`).
3. **Update Manifests**: the pipeline clones the separate `app-manifests` repository and runs `kustomize edit set image` in `overlays/test` or `overlays/prod`, from where the cluster picks up the new tags.

---

## Notes

- `DEBUG` defaults to `False`; set `DEBUG=True` only in `backend/.env` for local development.
- `/media/` and `/static/` are served by Django in every environment so avatars and the admin panel work behind the nginx proxy.
- `MEDIA_ROOT` must stay a dedicated directory; it is exposed under `/media/`.
