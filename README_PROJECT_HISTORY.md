# 🌊 Chennai District Flood Analysis — FloodWatch

A GIS-based flood analysis application for Chennai District that visualizes flood hazard categories, spatial density patterns, historical event records, and surveyed flood-depth observations through an interactive map.

## 📌 Project Overview

FloodWatch brings together Geographic Information Systems (GIS), spatial data analysis, and experimental machine learning to support the exploration of flood-related information across Chennai District.

The application provides an interactive interface for viewing flood-related datasets and understanding spatial patterns. It also includes an experimental flood-depth modelling component whose results require further validation before real-world use.

## ✨ Key Features

- **Interactive GIS Map:** Visualize Chennai flood-related spatial datasets.
- **Flood Hazard Categories:** Explore the available hazard-category features.
- **Density Analysis:** View spatial density cells and regional category information.
- **Flood Event Records:** Access mapped flood-event records.
- **Surveyed Flood Depths:** Display geographic flood-depth observation points.
- **REST API:** Retrieve GIS datasets through FastAPI endpoints.
- **Experimental ML Model:** Includes a linear regression model for flood-depth analysis, with documented verification results.

## 🗺️ GIS Data Layers

| Layer | API Endpoint | Feature Count |
|---|---|---:|
| Hazard Categories | `/gis/chennai/hazard-categories` | 5 |
| Density Cells | `/gis/chennai/density-cells` | 15 |
| Flood Event Records | `/gis/chennai/event-records` | 753 |
| Surveyed Flood Depths | `/gis/chennai/survey-depths` | 192 |

*These counts reflect the project's current packaged datasets.*

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI
- **GIS and Spatial Data:** GeoJSON and R-based spatial analysis
- **Machine Learning:** R and linear regression
- **API Testing:** FastAPI endpoints and automated backend tests

## 🏗️ Project Structure

The packaged project is organized approximately as follows:

```text
FloodWatch/
├── FloodWatch-main/
│   ├── backend/
│   │   ├── app/
│   │   └── requirements.txt
│   ├── src/
│   ├── package.json
│   └── README_RUN.md
├── r-backend/
│   └── outputs/
│       ├── 15_final_hazard_categories.geojson
│       ├── 15_final_density_region_category.geojson
│       ├── 15_final_event_records.geojson
│       └── 15_final_survey_depth_points.geojson
└── docs/
    └── Phase2A_Model_Verification_Report.md
```

The exact folder structure may vary depending on the repository version. Keep the `r-backend/outputs/` directory in the expected location because the API uses these generated spatial datasets.

## ⚙️ Installation and Setup

### Prerequisites

Install the following software:

- Python 3.10 or a compatible version supported by the backend dependencies
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
```

### 2. Start the backend

Open a terminal in the project directory:

```bash
cd FloodWatch-main/backend
python -m venv .venv
```

Activate the virtual environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
python -m pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Verify the backend at:

- Health endpoint: `http://127.0.0.1:8000/health`
- API documentation: `http://127.0.0.1:8000/docs`

If the repository layout or Python version differs, follow the included `README_RUN.md` and the backend dependency requirements.

### 3. Start the frontend

Open a second terminal and navigate to the frontend directory:

```bash
cd FloodWatch-main
npm ci
npm run dev
```

Open the local URL printed by Vite in the terminal.

Keep the backend and frontend terminals running while testing the application.

## 🧪 GIS API Endpoints

The backend exposes the following GIS endpoints:

```http
GET /gis/chennai/hazard-categories
GET /gis/chennai/density-cells
GET /gis/chennai/event-records
GET /gis/chennai/survey-depths
```

These endpoints provide the corresponding spatial datasets for the frontend map.

## 🤖 Machine Learning and Verification

The project includes an experimental linear regression model for estimating flood depth from elevation and regional information.

The independent verification reproduced the reported training metrics:

| Metric | Result |
|---|---:|
| Training MAE | 0.0981 m |
| Training RMSE | 0.1822 m |
| Training R² | 0.0100 |
| Mean regional CV MAE | 0.1014 m |
| Mean regional CV RMSE | 0.1528 m |
| Mean regional CV R² | -0.1796 |

### Interpretation

The model's training R² is close to zero, and the mean regional cross-validation R² is negative. These results indicate weak explanatory performance and poor generalization under the evaluated validation setup.

The verification reproduced the reported metrics, but it does **not** establish that the model can reliably predict flood depth at new locations.

## ⚠️ Limitations and Responsible Use

- Flood hazard categories represent the available analysis outputs and have not been independently validated as operational hazard classifications.
- Forecast values displayed by the current application may be simulated demonstration data rather than live predictions.
- The experimental regression model is not validated for operational flood forecasting or emergency decision-making.
- Basemap availability may depend on the configured map tile provider.
- Further data validation, model improvement, external testing, and operational evaluation are needed before real-world deployment.

FloodWatch is intended for project demonstration, GIS exploration, and further research. It should not be used as the sole basis for evacuation, emergency response, or public-safety decisions.

## 🚀 Future Enhancements

- Improve flood-depth model performance and validation.
- Integrate reliable, time-stamped rainfall and water-level data.
- Explore additional spatial and environmental features.
- Improve map usability and responsive design.
- Add monitoring, logging, and automated integration tests.
- Evaluate forecasting capabilities against independent real-world observations.

## 👩‍💻 Project Status

FloodWatch includes an interactive GIS interface, packaged Chennai spatial datasets, and a FastAPI backend. The experimental ML component has undergone independent verification, with its limitations documented.



## 📄 License

No license has been specified yet. Add a `LICENSE` file before distributing the project under an open-source license.

---

**FloodWatch — Exploring Chennai's flood-related spatial data through GIS and experimental machine learning.**
