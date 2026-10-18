# FloodWatch: Local Setup and Run Guide

This package contains the FloodWatch web app (React + Vite frontend, FastAPI backend)
and the four validated Chennai flood GIS layers that the map uses.

**What works now:** the Chennai GIS map (layers, popups, legend, caveats), the public GIS API,
and the citizen and admin pages in the browser.

**What is not in this package:** the R analysis scripts, the R model, and the raw source
datasets (KML files, DEM, boundary). None of them are needed to run the app. See section 12.

---

## 1. Prerequisites

| Tool | Version used to verify this package | Check with |
|---|---|---|
| Python | 3.13 | `python --version` (Windows: `py --version`) |
| Node.js | 22 (verified with 22.22.0) | `node --version` |
| npm | 10 (verified with 10.9.4) | `npm --version` |

You also need internet access the first time you install dependencies. No database,
Docker, Git or API key is required.

## 2. Package layout

After extraction, the folder structure must look like this. **Keep the two top-level
folders side by side**, because the backend reads the GIS layers from `r-backend/outputs`,
which sits next to `FloodWatch-main`.

```
FloodWatch_Integration_Files/
├── README_RUN.md
├── FloodWatch-main/
│   ├── index.html              Frontend entry page
│   ├── package.json            Node scripts and dependencies
│   ├── package-lock.json       Exact Node dependency versions (used by npm ci)
│   ├── tsconfig.json           TypeScript settings
│   ├── vite.config.ts          Vite (frontend build tool) settings
│   ├── src/                    React frontend source
│   │   ├── main.tsx, App.tsx
│   │   ├── components/         Pages and map (FloodMap.tsx holds the Chennai map)
│   │   ├── services/           API calls (api.ts sets the backend URL)
│   │   ├── hooks/, mocks/, types/, index.css
│   └── backend/
│       ├── requirements.txt    Python dependencies
│       ├── pytest.ini          Test settings
│       ├── .env.example        Optional local settings template
│       ├── app/                FastAPI backend (routers, services, storage, core)
│       └── tests/              Backend test suite (89 tests)
└── r-backend/
    └── outputs/                Validated Chennai GIS layers (read-only input)
        ├── 15_final_hazard_categories.geojson
        ├── 15_final_density_region_category.geojson
        ├── 15_final_event_records.geojson
        └── 15_final_survey_depth_points.geojson
```

The backend creates `backend/data/` and `backend/uploads/` the first time it runs.
Those folders hold runtime data. You do not need to create them.

## 3. Open a terminal in the right place

Use **two terminals**, one for the backend and one for the frontend.

* **Windows:** press Start, type `PowerShell`, and open it.
* **macOS / Linux:** open Terminal.

The commands below are written for **Windows PowerShell**. macOS and Linux differences are marked.

## 4. Set up and start the backend

### 4.1 Go to the backend folder

```powershell
cd C:\path\to\FloodWatch_Integration_Files\FloodWatch-main\backend
```

macOS / Linux: `cd /path/to/FloodWatch_Integration_Files/FloodWatch-main/backend`

### 4.2 Create a Python virtual environment

A virtual environment keeps this project's Python packages separate from the rest of your computer.

```powershell
python -m venv .venv
```

If `python` is not found on Windows, use `py -3 -m venv .venv`.

### 4.3 Activate it

```powershell
.venv\Scripts\Activate.ps1
```

If PowerShell blocks the script, run this once, then try again:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Windows Command Prompt: `.venv\Scripts\activate.bat`
macOS / Linux: `source .venv/bin/activate`

Your prompt should now start with `(.venv)`.

### 4.4 Install backend dependencies

```powershell
python -m pip install -r requirements.txt
```

This installs FastAPI, Uvicorn, Pydantic, PyJWT, bcrypt, pytest and httpx at the exact versions in `requirements.txt`.

### 4.5 (Optional) Configure environment variables

**You can skip this step.** The backend runs without any `.env` file, using built-in defaults.

To change a setting, copy the template and edit the copy:

```powershell
copy .env.example .env
```

macOS / Linux: `cp .env.example .env`

Edit `.env` in any text editor. Never share this file, because it may contain a secret.
See section 9 for what each variable does.

### 4.6 Start the backend

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Leave this terminal open. You should see a line that ends with `FloodWatch backend ready`
and `Uvicorn running on http://127.0.0.1:8000`.

A line that says `JWT_SECRET is the development default` is expected on your own computer.

## 5. Check the backend

Open a **third** terminal (or your browser) and check these addresses.

| Address | What you should see |
|---|---|
| `http://127.0.0.1:8000/health` | `{"success":true,"data":{"status":"ok",...}}` |
| `http://127.0.0.1:8000/docs` | Interactive API documentation |

### 5.1 Check the four Chennai GIS endpoints

Each endpoint returns a large GeoJSON file, so save the output to a file or read it in the browser.

Use `curl.exe` on Windows (built into Windows 10 and 11), or `curl` on macOS / Linux. You can also paste each address into your browser:

```
curl.exe -s http://127.0.0.1:8000/gis/chennai/hazard-categories
curl.exe -s http://127.0.0.1:8000/gis/chennai/density-cells
curl.exe -s http://127.0.0.1:8000/gis/chennai/event-records
curl.exe -s http://127.0.0.1:8000/gis/chennai/survey-depths
```

Expected feature counts:

| Endpoint | Features |
|---|---|
| `/gis/chennai/hazard-categories` | 5 |
| `/gis/chennai/density-cells` | 15 |
| `/gis/chennai/event-records` | 753 |
| `/gis/chennai/survey-depths` | 192 |

Each response has the form `{"success": true, "data": {"type": "FeatureCollection", "features": [...]}}`.

### 5.2 Optional: run the backend tests

Open a third terminal, go to the `backend` folder, activate the environment (step 4.3), and run:

```powershell
python -m pytest
```

Expected result: `89 passed`. The tests create their own temporary data and do not touch your `data/` folder.

## 6. Set up and start the frontend

Open a **second** terminal (leave the backend running in the first).

### 6.1 Go to the project folder

```powershell
cd C:\path\to\FloodWatch_Integration_Files\FloodWatch-main
```

### 6.2 Install Node dependencies

```powershell
npm ci
```

`npm ci` installs the exact versions in `package-lock.json`. Use it instead of `npm install` for a repeatable setup.

### 6.3 Start the frontend

```powershell
npm run dev
```

Wait for `Local: http://localhost:3000/`.

## 7. Open the app

1. Open **http://localhost:3000/** in your browser.
2. Click **Continue as Citizen** for the citizen portal, or **Admin Login** for the admin portal.
   Both buttons use a local demo session and ask for no password.
3. Click **Map** (citizen) or **Map & Zones** (admin). The Chennai map loads with the source
   hazard categories, the 2015 event records and the surveyed depths. Use the **Map Layers**
   panel to switch layers on and off. Click any feature for its details.

The frontend talks to the backend at `http://localhost:8000`, which is hard-coded in
`src/services/api.ts`. If you change the backend port, you must also change that file.

## 8. Stop the servers

In each terminal that is running a server, press **Ctrl + C**.
To leave the virtual environment, type `deactivate`.

## 9. Environment variables

The backend reads these variables from `backend/.env` or from your computer's environment.
Variables set in the environment override `.env`.

**Required:** none. The app runs with defaults.

| Variable | Default | Required? | Purpose |
|---|---|---|---|
| `JWT_SECRET` | development value | **Required for any shared or production use** | Signs login tokens. The default is public, so anyone can forge tokens with it. |
| `ENVIRONMENT` | `development` | Optional | `test` disables the startup backup. Use `production` only on a real server. |
| `DEBUG` | `true` | Optional | Debug-level logging. Use `false` for production. |
| `APP_NAME` | `FloodWatch API` | Optional | Title shown in the API documentation. |
| `JWT_ALGORITHM` | `HS256` | Optional | Token signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Optional | Token lifetime in minutes (24 hours). |
| `CORS_ORIGINS` | localhost ports 3000 and 5173 | Optional | Comma-separated browser origins the API accepts. |
| `DATA_DIR` | `data` | Optional | Folder for the JSON data files. Relative paths start from `backend/`. |
| `UPLOAD_DIR` | `uploads` | Optional | Folder for uploaded report photos. |
| `MAX_UPLOAD_SIZE_MB` | `5` | Optional | Largest accepted photo, in megabytes. |

**Secrets:** `JWT_SECRET` is the only secret. The package contains no API keys, passwords or
tokens, and this project uses no external AI or map API key.

**Variables that exist in the code but have no effect, so they are not in `.env.example`:**
`HOST` and `PORT` (choose the address and port with the `uvicorn` command in step 4.6),
and `ALLOWED_UPLOAD_EXTENSIONS` (uploads are checked against a fixed list in the code).

**Frontend:** there are no frontend environment variables. The only related setting, `DISABLE_HMR`,
is optional and only changes hot reloading during development.

### Development versus production

* **Development (this guide):** the `.env` you create locally. Keep it on your computer only.
* **Production:** a separate file or environment on the server, not this one. Set a new `JWT_SECRET`,
  `ENVIRONMENT=production`, `DEBUG=false`, and `CORS_ORIGINS` set to your real site only.
  The frontend URL is hard-coded, so production needs a code change first. This package has not been
  deployed or tested in production.

## 10. Troubleshooting

**`python` or `py` is not recognised.** Install Python 3.13 from python.org and tick "Add python.exe to PATH".
Close and reopen PowerShell.

**`Activate.ps1 cannot be loaded because running scripts is disabled`.** Run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then activate again.

**`No module named uvicorn` or `No module named fastapi`.** The virtual environment is not active,
or step 4.4 did not finish. Activate it (look for `(.venv)`) and run `python -m pip install -r requirements.txt` again.

**`[Errno 10048]` or `address already in use` (port 8000).** Another program uses port 8000.
Find it with `netstat -ano | findstr :8000`, then close that program. Or stop a previous backend with Ctrl + C.
To use a different port, change the command in step 4.6 and also change `API_BASE_URL` in
`src/services/api.ts`.

**Port 3000 is busy.** The frontend script is fixed to port 3000 (`package.json`). Close the program using
that port. If Vite starts on another port, the backend will reject it unless you add that origin to `CORS_ORIGINS`.

**Map shows "Chennai GIS layers unavailable" or an endpoint returns 404 with "The R outputs folder is missing or incomplete".**
The backend cannot find `r-backend/outputs`. Check that `r-backend` sits next to `FloodWatch-main`, and that it
contains the four `15_final_*.geojson` files. Do not rename or move the `FloodWatch-main` folder on its own.

**CORS error in the browser console** (for example "blocked by CORS policy"). The page is not on an origin the
backend allows. Open the app at `http://localhost:3000`, not a file path. To allow another origin, add it to
`CORS_ORIGINS` in `backend/.env` and restart the backend.

**`Cannot find module` or `npm ERR!` during `npm ci`.** Check the Node version (`node --version`, 22 recommended),
then delete any `node_modules` folder and run `npm ci` again.

**Wrong folder.** `pytest` and `uvicorn app.main:app` must run from `FloodWatch-main\backend`. `npm` commands must
run from `FloodWatch-main`. Running them from the wrong folder causes "file not found" or "No module named app" errors.

**Protected pages or actions fail (for example submitting a report through the API, funds, or the admin analytics).**
The browser login is a local demo and does not call the backend login. Protected API routes need a token. Get one
from the API documentation at `http://127.0.0.1:8000/docs`: call `POST /auth/register` (name, email, phone, password),
then `POST /auth/login` (email, password). Copy the `token` value and use it as `Authorization: Bearer <token>`. Admin-only routes (for example `/funds`) return 403 for a citizen token. The API has no route that creates an admin account, so an admin must be set up by editing the `role` in `backend/data/users.json` (set it to `admin`, then log in again). Do this only on your local copy.

**Backend shows a `WARNING ... JWT_SECRET is the development default`.** Expected in local development. Set `JWT_SECRET` before any shared use.

**Map shows a grey background, not streets.** The map's street tiles come from an external CARTO server. An offline or
restricted network blocks them. The Chennai layers still display.

**Uploads or data files appeared in `backend/`.** Expected. The backend writes `backend/data/` and `backend/uploads/`
on first run. Delete them to reset local data. Only do this on your local copy.

## 11. Current integration status

| Area | Status |
|---|---|
| Chennai GIS map (categories, density cells, event records, surveyed depths) | Working. Layers read from the validated R outputs, which are read-only. |
| Chennai GIS API (`/gis/chennai/*`, 4 endpoints) | Working. Verified with 89 backend tests and a live run. |
| Flood reports, alerts, funds, forecast, priority, analytics pages | Present in the code. The seed data is a Los Angeles demo dataset, so these pages do not show Chennai data. |
| Browser login | Demo only. No backend account is used by the pages. |
| R flood model | **Not integrated.** The running app does not load, call or depend on any R model. This package contains no model file. Its integration is future work. |

Notes on what the map shows: hazard categories are source categories, not independently validated.
Event records are locations, not depth measurements. Surveyed depths are in metres (converted from inches).
Absence of a record or point is not evidence of no flooding. The app shows no flood prediction or probability.

## 12. Not included

* **R scripts** (for example `15_final_gis_outputs.R`) and the R results report. The app does not run them.
* **Raw source data** (hazard KML files, DEM, boundary GeoJSON). Only the validated outputs are included.
* **The R model file** (`chennai_flood_model.rds`). It is not used by the app.
* **Node and Python environments** (`node_modules`, `.venv`), build output (`dist`), caches and logs. Create them with the steps above.
* **Real secrets.** There are none in this package. Create your own `JWT_SECRET` if you need one.

These can be added as a separate package when you need them.
