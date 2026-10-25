# FloodWatch: Chennai District Flood Analysis

FloodWatch is a prototype for exploring flood-related spatial data for Chennai District. It has an interactive map of validated GIS layers and a FastAPI backend for reports, alerts, notifications, funds, priority zones and analytics.

> **Prototype.** This is an academic demonstration. It is not a live flood-warning system. See [Limitations](#limitations).

Earlier project notes are kept in [README_PROJECT_HISTORY.md](README_PROJECT_HISTORY.md).

## Repository layout

```
.
├── FloodWatch-main/            Application root (frontend and backend)
│   ├── src/                    React frontend
│   ├── backend/                FastAPI backend
│   │   ├── app/                Routers, services, schemas, storage
│   │   ├── tests/              pytest suite
│   │   └── .env.example        Backend environment template (placeholders only)
│   ├── .env.example            Frontend environment template
│   └── package.json            Frontend scripts and dependencies
├── r-backend/outputs/          Chennai GIS GeoJSON served by /gis/chennai/*
├── render.yaml                 Render blueprint for the backend
└── README_RUN.md               Earlier run notes
```

The GIS files live in `r-backend/outputs/` at the repository root. The backend reads them from there, so keep that folder in place.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS 4, Leaflet, Recharts |
| Backend | FastAPI, Pydantic 2, PyJWT, bcrypt, JSON file storage |
| GIS data | GeoJSON (WGS 84), served as-is by the API |

## Local development

Requirements: Node.js 22 or newer, Python 3.12 or newer.

**Backend** (from `FloodWatch-main/backend`)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                  # Windows: copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000. Interactive docs: http://localhost:8000/docs.

**Frontend** (from `FloodWatch-main`, in a second terminal)

```bash
npm ci
npm run dev
```

App: http://localhost:3000. Without `VITE_API_BASE_URL`, the development build calls `http://localhost:8000`.

**Checks**

```bash
# from FloodWatch-main/backend
python -m pytest
# from FloodWatch-main
npm run lint
npm run build
```

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Frontend build | Public backend URL with no trailing slash. Production builds never fall back to localhost. |
| `CORS_ORIGINS` | Backend | Comma-separated frontend origins allowed to call the API. Use the exact frontend URL in production. |
| `JWT_SECRET` | Backend | Signing key for tokens. Use a long random value in production. Never commit it. |
| `GIS_DATA_DIR` | Backend (optional) | Folder with the four Chennai GeoJSON files. Blank means `r-backend/outputs/`. |
| `DATA_DIR`, `UPLOAD_DIR` | Backend (optional) | Runtime JSON data and uploaded images. |

## API

| Endpoint | Returns | Expected |
|---|---|---|
| `GET /health` | Service status | 200 |
| `GET /gis/chennai/hazard-categories` | Source hazard categories | 5 features |
| `GET /gis/chennai/density-cells` | Region-by-category density cells | 15 features |
| `GET /gis/chennai/event-records` | 2015 flood-event location records | 753 features |
| `GET /gis/chennai/survey-depths` | Surveyed inundation depths (metres) | 192 features |

Other routes cover auth, reports, alerts, notifications, funds, priority and analytics. See `/docs` when the backend is running.

## Deployment

**Backend on Render**

- Use the `render.yaml` blueprint. It sets the service root to `FloodWatch-main/backend`, the start command, and the health check `/health`.
- After the first deploy, set `CORS_ORIGINS` to the exact Vercel URL.

**Frontend on Vercel**

- Set the project **Root Directory** to `FloodWatch-main`. Vite is detected automatically.
- Set `VITE_API_BASE_URL` to the Render URL, with no trailing slash, then redeploy.

## Limitations

- Storage is local JSON files. On Render's free tier the filesystem resets on each deploy, and the service sleeps when idle.
- The frontend sign-in is demo mode. It does not call the backend's authentication endpoints.
- Runtime data files under `backend/data/` and `backend/backups/` are currently tracked in Git. They contain no credentials, but they should be untracked before a production deployment.
- Large GeoJSON files (about 13 MB each for two layers) increase memory use. This has not been measured on small hosting plans.
