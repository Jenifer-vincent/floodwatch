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

The exact directory structure may vary depending on the current repository layout.

FloodWatch/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── main.py
│   └── requirements.txt
│
├── r-backend/
│   └── outputs/
│       └── GIS data files
│
├── README.md
└── .gitignore

Note: Adapt the directory names to match the actual repository before publishing this README.

⚙️ Getting Started

Prerequisites

Install the following before running the project:

- Node.js and npm
- Python 3.10 or later, subject to the backend's actual dependency requirements
- Git

1. Clone the Repository

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd FloodWatch

2. Start the Backend

Navigate to the backend directory:

cd backend

Create and activate a virtual environment.

Windows:

python -m venv venv
venv\Scripts\activate

Install the backend dependencies:

pip install -r requirements.txt

Start the FastAPI server using the command appropriate for your backend entry point:

uvicorn main:app --reload --host 127.0.0.1 --port 8000

The backend should be available at:

- API base URL: "http://127.0.0.1:8000"
- Interactive API documentation: "http://127.0.0.1:8000/docs"

3. Start the Frontend

Open a new terminal and navigate to the frontend directory:

cd frontend
npm install
npm run dev

Open the local URL displayed by Vite in your terminal.

If the project uses port "3000", open "http://localhost:3000".

4. Configure the API URL

Set the frontend environment variable to point to your backend.

Create or update the frontend ".env" file:

VITE_API_BASE_URL=http://127.0.0.1:8000

Ensure the frontend and backend use matching API routes and that the backend allows requests from the frontend origin.

5. Configure GIS Data

Make sure the validated GIS output files are available at the location expected by the backend.

For deployments, configure the GIS data directory using the project's supported "GIS_DATA_DIR" environment variable. Keep the GIS files available to the running backend rather than relying on files that exist only on a local development machine.

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

🧪 Testing and Validation

The GIS integration has been validated against the project's available datasets. The integration work also passed the recorded production-build, TypeScript, and 89-test checks at the time of validation.

Run the project's actual test commands before publishing a new release, since subsequent code changes may affect those results.

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
