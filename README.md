🌊 FloodWatch — Chennai Flood Analysis & Visualization

A GIS-powered web application for exploring flood hazard categories, spatial density, historical flood events, and recorded water depths across Chennai, Tamil Nadu.

FloodWatch is a full-stack geospatial application designed to make flood-related information easier to explore through an interactive map and structured GIS datasets. It combines a React-based frontend with a Python FastAPI backend to visualize flood-related spatial information and support data-driven analysis.

🎯 Project Objectives

- Visualize flood-related GIS data across Chennai.
- Explore different flood hazard categories using interactive map layers.
- Present historical flood events and recorded water-depth information.
- Make geospatial information easier to understand through map legends, popups, and layer controls.
- Establish a foundation for future integration of flood-risk analysis and machine-learning models.

✨ Features

- Interactive GIS Map: Explore spatial flood-related data centered on Chennai.
- Multiple Map Layers: Switch between supported GIS datasets.
- Flood Hazard Visualization: Explore five hazard categories.
- Spatial Density Analysis: Visualize 15 density cells.
- Historical Event Data: Access 753 flood-related event records.
- Water-Depth Data: Explore 192 recorded survey-depth entries.
- Map Legends and Popups: Understand the meaning of displayed spatial features.
- API-Driven Architecture: Retrieve GIS data through FastAPI endpoints.
- Error and Loading States: Handle data loading and API failures in the interface.
- Deployment Configuration: Support configurable API URLs and GIS data directories.

🗺️ GIS Data Overview

The application currently integrates four validated GIS data collections.

Dataset| Available data
Flood hazard categories| 5 categories
Spatial density| 15 cells
Flood event records| 753 records
Survey water depths| 192 records

These datasets support spatial exploration and analysis. Their presence does not, by itself, indicate live flood monitoring or real-time prediction.

🛠️ Technology Stack

Frontend

- React
- TypeScript
- Vite
- Interactive map and GIS visualization components

Backend

- Python
- FastAPI
- REST API endpoints
- GIS data-serving and integration logic

Geospatial Analysis

- GIS datasets and spatial layers
- Historical flood-event information
- Hazard-category and water-depth visualization

Deployment

- Render-compatible backend configuration
- Environment-based frontend API configuration
- Configurable GIS data paths

🏗️ System Architecture

              User
               |
               v
       React + Vite Frontend
               |
               | REST API requests
               v
         FastAPI Backend
               |
               v
       GIS Data Integration
               |
       +-------+--------+
       |       |        |
       v       v        v
     Hazard  Density  Flood Events
       |
       v
   Spatial Map Visualization

The frontend requests GIS information from the backend, which serves the configured datasets through dedicated API endpoints. The frontend then presents the available information through interactive map layers and related controls.

📂 Project Structure

The repository root contains the app folder and the original R outputs:

```
.
├── FloodWatch-main/
│   ├── src/                    React frontend
│   ├── backend/
│   │   ├── app/                FastAPI application
│   │   ├── tests/              pytest suite
│   │   └── gis_data/           Four Chennai GeoJSON layers (bundled copy)
│   ├── .env.example            Frontend environment template
│   └── package.json
├── r-backend/
│   └── outputs/                Original R outputs (fallback for local runs)
├── render.yaml                 Render blueprint for the backend
└── README.md
```

The four GIS files are bundled in `FloodWatch-main/backend/gis_data/`, so the backend does not depend on files outside its own folder. If that copy is missing, the backend falls back to `r-backend/outputs/` at the repository root.

⚙️ Getting Started

Prerequisites

- Git
- Node.js and npm (tested with Node.js 22 and npm 10; `package.json` does not pin a version)
- Python 3.13 (pinned in `FloodWatch-main/backend/.python-version`)

1. Clone the Repository

git clone https://github.com/Jenifer-vincent/floodwatch
cd floodwatch

The application code is in the `FloodWatch-main` folder.

2. Start the Backend

Navigate to the backend folder:

cd FloodWatch-main/backend

Create and activate a virtual environment.

Windows:

python -m venv .venv
.venv\Scripts\activate

macOS/Linux:

python -m venv .venv
source .venv/bin/activate

Install the dependencies and create your local settings file:

pip install -r requirements.txt
cp .env.example .env

On Windows, use `copy .env.example .env` instead of `cp`. Open `.env` and replace the `JWT_SECRET` placeholder with a long random value. The `.env` file stays on your machine and is ignored by Git.

Start the FastAPI server:

python -m uvicorn app.main:app --reload --port 8000

The backend should be available at:

- API base URL: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

3. Start the Frontend

Open a new terminal in the `FloodWatch-main` folder (not the backend folder):

npm ci
npm run dev

Open http://localhost:3000. In development, the frontend calls the backend at http://localhost:8000 by default. Start the backend first.

4. Optional: Set a Different API URL

To point the frontend at another backend, copy `FloodWatch-main/.env.example` to `FloodWatch-main/.env.local` and set `VITE_API_BASE_URL`. Restart `npm run dev` after changing it. The backend allows requests from http://localhost:3000 by default, through `CORS_ORIGINS`.

5. Run the Checks

From `FloodWatch-main/backend`:

python -m pytest

From `FloodWatch-main`:

npm run lint
npm run build

6. GIS Data

The four GIS files are bundled in `FloodWatch-main/backend/gis_data/`, so no extra setup is needed for local runs. If that folder is missing, the backend falls back to `r-backend/outputs/` at the repository root.

Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Frontend build | Public backend URL with no trailing slash. Production builds never fall back to localhost. |
| `CORS_ORIGINS` | Backend | Comma-separated frontend origins allowed to call the API. Use the exact frontend URL in production. |
| `JWT_SECRET` | Backend | Signing key for tokens. Use a long random value in production. Never commit it. |
| `GIS_DATA_DIR` | Backend (optional) | Folder with the four Chennai GeoJSON files. Blank means `backend/gis_data/`, then `r-backend/outputs/`. |
| `DATA_DIR`, `UPLOAD_DIR` | Backend (optional) | Runtime JSON data and uploaded images. |

🔌 API Integration

The backend exposes Chennai GIS routes under:

/gis/chennai/...

These routes provide access to the integrated GIS datasets.

For the complete list of supported endpoints, request and response formats, and validation details, refer to the running FastAPI documentation at "/docs".

🚀 Deployment

FloodWatch includes configuration intended to support deployment of its frontend and backend.

Before deploying:

1. Deploy the FastAPI backend to a supported hosting service.
2. Configure "VITE_API_BASE_URL" with the deployed backend's base URL.
3. Configure "GIS_DATA_DIR" to point to the deployed GIS data location.
4. Ensure the required GIS output files are included or otherwise accessible at runtime.
5. Configure CORS to allow requests from the deployed frontend domain.
6. Verify the GIS endpoints and interactive map after deployment.

Important: Successful deployment requires the application code, environment variables, and GIS data files to be configured together.

**Option A: Render**

**Backend on Render**

- Use the `render.yaml` blueprint. It sets the service root to `FloodWatch-main/backend`, the start command, and the health check `/health`.
- After the first deploy, set `CORS_ORIGINS` to the exact Vercel URL.

**Frontend on Vercel**

- Set the project **Root Directory** to `FloodWatch-main`. Vite is detected automatically.
- Set `VITE_API_BASE_URL` to the Render URL, with no trailing slash, then redeploy.

**Option B: Vercel (free Hobby plan, for demonstration)**

Use two Vercel projects, both built from the `deployment-prep` branch. The Hobby plan is for personal, non-commercial use. Python 3.13 is set by `FloodWatch-main/backend/.python-version`.

1. **Backend project:** Root Directory `FloodWatch-main/backend`. Vercel detects FastAPI from `app/main.py`. Set these environment variables:
   - `DATA_DIR` = `/tmp/floodwatch/data`
   - `UPLOAD_DIR` = `/tmp/floodwatch/uploads`
   - `ENVIRONMENT` = `production`, `DEBUG` = `false`
   - `JWT_SECRET` = a long random value generated on your own machine
2. **Frontend project:** Root Directory `FloodWatch-main`, Vite preset. Set `VITE_API_BASE_URL` to the backend's Vercel URL, with no trailing slash.
3. Deploy the backend first, then the frontend. Then set `CORS_ORIGINS` on the backend to the exact frontend URL and redeploy the backend.
4. Check `/health` and the four `/gis/chennai/*` endpoints on the backend URL.

Only the bundled GIS files are guaranteed to be present on Vercel. See the limitations below for what is temporary.

🧪 Testing and Validation

The GIS integration has been validated against the project's available datasets. The integration work also passed the recorded production-build, TypeScript, and 93-test backend checks at the time of validation.

Run the project's actual test commands before publishing a new release, since subsequent code changes may affect those results.

⚠️ Limitations

- Storage is local JSON files. On Render's free tier the filesystem resets on each deploy, and the service sleeps when idle.
- **Temporary filesystem on Vercel:** users, login sessions, reports, alerts, notifications, funds, forecast and priority edits, uploaded photos and backups are written to `/tmp`. They are lost on cold starts and redeploys.
- **Separate instances:** each Vercel instance has its own `/tmp`, so data created on one instance may not appear on another.
- **Read-only GIS layers:** the four Chennai layers ship with the code and are not affected by these limits.
- **Cold starts:** the first request after a quiet period is slow.
- **Not production-ready.** This is a prototype for demonstration.
- The frontend sign-in is demo mode. It does not call the backend's authentication endpoints.
- Runtime data under `backend/data/` and `backend/backups/` is no longer tracked in Git. It is created at runtime and ignored by `backend/.gitignore`.
- Large GeoJSON files (about 13 MB each for two layers) increase memory use. This has not been measured on small hosting plans.

🔮 Future Enhancements

- Integrate the planned R-based flood-analysis or prediction model.
- Add validated flood-risk scoring and prediction capabilities.
- Incorporate additional verified geospatial datasets.
- Improve spatial filtering and location-based analysis.
- Add rainfall-related analysis when suitable data becomes available.
- Explore timely flood alerts using reliable, verified data sources.

These are potential future enhancements, not claims that the features are already implemented.

🌍 Project Impact

FloodWatch aims to make Chennai's flood-related spatial information more accessible through an interactive, map-based interface. By combining geospatial datasets with a web application, the project provides a foundation for further work in urban flood analysis, GIS visualization, and data-driven disaster preparedness.

👩‍💻 Author

Jenifer

BCA — Computer Applications

Areas of interest:

- Python Development
- Artificial Intelligence and Machine Learning
- Geospatial Data Analysis
- Full-Stack Development

📄 License

Choose and add an appropriate open-source license before distributing the project publicly. Until then, the project's licensing terms are unspecified.

---

FloodWatch — Making flood-related spatial data easier to explore and understand.
