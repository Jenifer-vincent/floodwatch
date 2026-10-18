"""Initial data seeding.

Only collection files that are missing (or empty) are seeded. Transactional
data (users, reports, notifications, alerts, transactions) is intentionally
left empty — it is created at runtime. Geographic/calibration data (GIS,
forecast, priority, treasury) is baseline configuration.
"""

from __future__ import annotations

from typing import Any

from app.storage.json_storage import storage

_INITIAL_TREASURY = 1420000.0

_ZONES = [
    {
        "id": "Z-1",
        "name": "Sector 4: Lower River Basin",
        "center": [34.0622, -118.2237],
        "radius": 6000.0,
        "riskLevel": "high",
        "priorityScore": 88,
        "activeReportsCount": 0,
        "lastUpdated": "07:30",
    },
    {
        "id": "Z-2",
        "name": "Sector 12: East Creek Outlet",
        "center": [34.0754, -118.2105],
        "radius": 5000.0,
        "riskLevel": "medium",
        "priorityScore": 65,
        "activeReportsCount": 0,
        "lastUpdated": "06:45",
    },
    {
        "id": "Z-3",
        "name": "Sector 9: West Hills Drainage Zone",
        "center": [34.0382, -118.2710],
        "radius": 4500.0,
        "riskLevel": "low",
        "priorityScore": 24,
        "activeReportsCount": 0,
        "lastUpdated": "05:00",
    },
    {
        "id": "Z-4",
        "name": "Sector 3: Downtown Plaza Gutterway",
        "center": [34.0482, -118.2580],
        "radius": 4000.0,
        "riskLevel": "medium",
        "priorityScore": 52,
        "activeReportsCount": 0,
        "lastUpdated": "07:10",
    },
]

_ROADS = [
    {
        "name": "Highway 101 Underpass",
        "path": [
            [34.0582, -118.2380],
            [34.0540, -118.2420],
            [34.0490, -118.2450],
        ],
    },
    {
        "name": "Alameda Interchange Sector",
        "path": [
            [34.0510, -118.2390],
            [34.0530, -118.2437],
            [34.0560, -118.2490],
        ],
    },
]

_HOSPITALS = [
    {"name": "Downtown Emergency Hospital", "lat": 34.0482, "lng": -118.2580},
    {"name": "Civic Health Center", "lat": 34.0610, "lng": -118.2410},
]

_SHELTERS = [
    {"name": "Sector 4 Civic Emergency Shelter", "lat": 34.0682, "lng": -118.2210},
    {"name": "Sector 3 Central Safe Haven", "lat": 34.0382, "lng": -118.2710},
]

_RIVERS = [
    {
        "name": "LA River - Main Canal Outlet",
        "path": [
            [34.0750, -118.2200],
            [34.0650, -118.2220],
            [34.0550, -118.2280],
            [34.0450, -118.2310],
        ],
    }
]

_EVACUATION_ROUTES = [
    {
        "name": "West Evacuation Highway Lane",
        "path": [
            [34.0350, -118.2600],
            [34.0280, -118.2750],
        ],
    },
    {
        "name": "North Basin Exit Route",
        "path": [
            [34.0650, -118.2280],
            [34.0780, -118.2320],
        ],
    },
]

_FORECASTS = [
    {
        "locationId": "loc-1",
        "location": "Sector 4: Lower River Basin",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "6 hours",
        "riskLevel": "high",
        "predictedWaterLevel": 1.4,
        "confidence": 0.82,
    },
    {
        "locationId": "loc-1",
        "location": "Sector 4: Lower River Basin",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "12 hours",
        "riskLevel": "critical",
        "predictedWaterLevel": 1.8,
        "confidence": 0.74,
    },
    {
        "locationId": "loc-1",
        "location": "Sector 4: Lower River Basin",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "24 hours",
        "riskLevel": "high",
        "predictedWaterLevel": 1.3,
        "confidence": 0.61,
    },
    {
        "locationId": "loc-1",
        "location": "Sector 4: Lower River Basin",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "48 hours",
        "riskLevel": "moderate",
        "predictedWaterLevel": 1.1,
        "confidence": 0.58,
    },
    {
        "locationId": "loc-2",
        "location": "Sector 12: East Creek Outlet",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "6 hours",
        "riskLevel": "moderate",
        "predictedWaterLevel": 0.7,
        "confidence": 0.78,
    },
    {
        "locationId": "loc-2",
        "location": "Sector 12: East Creek Outlet",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "24 hours",
        "riskLevel": "moderate",
        "predictedWaterLevel": 0.6,
        "confidence": 0.66,
    },
    {
        "locationId": "loc-2",
        "location": "Sector 12: East Creek Outlet",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "48 hours",
        "riskLevel": "moderate",
        "predictedWaterLevel": 0.55,
        "confidence": 0.6,
    },
    {
        "locationId": "loc-3",
        "location": "Sector 3: Downtown Plaza Gutterway",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "6 hours",
        "riskLevel": "low",
        "predictedWaterLevel": 0.2,
        "confidence": 0.85,
    },
    {
        "locationId": "loc-3",
        "location": "Sector 3: Downtown Plaza Gutterway",
        "timestamp": "2026-08-28T00:00:00Z",
        "horizon": "48 hours",
        "riskLevel": "low",
        "predictedWaterLevel": 0.3,
        "confidence": 0.72,
    },
]

_PRIORITY_CONFIG = {
    "floodSeverityWeight": 1.2,
    "infrastructureRiskWeight": 1.0,
    "populationDensityWeight": 0.8,
    "roadAccessWeight": 0.6,
}

_PRIORITY_ZONES = [
    {
        "zoneId": "Z-1",
        "zoneName": "Sector 4: Lower River Basin",
        "score": 88.0,
        "riskLevel": "high",
        "reportCount": 0,
        "factors": [
            {"name": "Flood Severity", "value": 90},
            {"name": "Infrastructure Risk", "value": 80},
            {"name": "Population Density", "value": 95},
            {"name": "Road Access", "value": 85},
        ],
        "recommendedAction": "Elevated monitoring. Pre-position emergency response units.",
    },
    {
        "zoneId": "Z-2",
        "zoneName": "Sector 12: East Creek Outlet",
        "score": 65.0,
        "riskLevel": "medium",
        "reportCount": 0,
        "factors": [
            {"name": "Flood Severity", "value": 70},
            {"name": "Infrastructure Risk", "value": 60},
            {"name": "Population Density", "value": 65},
            {"name": "Road Access", "value": 60},
        ],
        "recommendedAction": "Active monitoring. Prepare contingency resources.",
    },
    {
        "zoneId": "Z-4",
        "zoneName": "Sector 3: Downtown Plaza Gutterway",
        "score": 52.0,
        "riskLevel": "medium",
        "reportCount": 0,
        "factors": [
            {"name": "Flood Severity", "value": 55},
            {"name": "Infrastructure Risk", "value": 60},
            {"name": "Population Density", "value": 50},
            {"name": "Road Access", "value": 45},
        ],
        "recommendedAction": "Active monitoring. Prepare contingency resources.",
    },
    {
        "zoneId": "Z-3",
        "zoneName": "Sector 9: West Hills Drainage Zone",
        "score": 24.0,
        "riskLevel": "low",
        "reportCount": 0,
        "factors": [
            {"name": "Flood Severity", "value": 20},
            {"name": "Infrastructure Risk", "value": 25},
            {"name": "Population Density", "value": 30},
            {"name": "Road Access", "value": 35},
        ],
        "recommendedAction": "Standard monitoring. No immediate action required.",
    },
]


def _safe_seed(name: str, default: Any) -> None:
    current = storage.load(name, None)
    if current is None:
        storage.save(name, default)


def ensure_seed() -> None:
    storage.data_dir.mkdir(parents=True, exist_ok=True)

    _safe_seed(
        "gis",
        {
            "zones": _ZONES,
            "roads": _ROADS,
            "hospitals": _HOSPITALS,
            "shelters": _SHELTERS,
            "rivers": _RIVERS,
            "evacuationRoutes": _EVACUATION_ROUTES,
        },
    )
    _safe_seed("forecasts", {"items": _FORECASTS, "source": "stored-calibration", "updatedAt": None})
    _safe_seed(
        "priority",
        {
            "zones": _PRIORITY_ZONES,
            "config": _PRIORITY_CONFIG,
            "calculatedAt": None,
        },
    )
    _safe_seed(
        "funds",
        {
            "totalBudget": _INITIAL_TREASURY,
            "availableBalance": _INITIAL_TREASURY,
            "allocations": [],
            "transactions": [],
        },
    )
    # Transactional collections — start empty on first boot.
    for name in ("users", "reports", "notifications", "alerts", "tokens"):
        _safe_seed(name, [] if name != "tokens" else {"revoked": []})