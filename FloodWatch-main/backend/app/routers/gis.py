"""GIS routes — map layer data, compatible with the Phase 2 frontend GIS types."""

from fastapi import APIRouter, Response

from app.core.responses import NOT_FOUND, AppError, ok
from app.schemas.common import ApiResponse
from app.schemas.gis import (
    GISDataOut,
    GISLayerOut,
    GISLineOut,
    GISPointOut,
    GISReportOut,
    GISZoneOut,
)
from app.services import gis_service

router = APIRouter(prefix="/gis", tags=["gis"])


@router.get(
    "/reports",
    response_model=ApiResponse[list[GISReportOut]],
    summary="Flood reports as GIS points",
    description="Non-archived flood reports as map points with coordinates.",
)
def gis_reports() -> dict:
    return ok([r.model_dump() for r in gis_service.reports()])


@router.get(
    "/zones",
    response_model=ApiResponse[list[GISZoneOut]],
    summary="Risk zones",
    description="Risk zones with center, radius and risk level.",
)
def gis_zones() -> dict:
    return ok([z.model_dump() for z in gis_service.zones()])


@router.get(
    "/layers",
    response_model=ApiResponse[list[GISLayerOut]],
    summary="All GIS layers",
    description=(
        "A ready-to-render list of map layers (reports, zones, roads, "
        "hospitals, shelters, rivers, evacuation routes)."
    ),
)
def gis_layers() -> dict:
    return ok([l.model_dump() for l in gis_service.layers()])


@router.get(
    "/roads",
    response_model=ApiResponse[list[GISLineOut]],
    summary="Road segments",
    description="Road segments as geographic poly-lines.",
)
def gis_roads() -> dict:
    return ok([r.model_dump() for r in gis_service.roads()])


@router.get(
    "/hospitals",
    response_model=ApiResponse[list[GISPointOut]],
    summary="Hospitals",
    description="Hospital locations as map points.",
)
def gis_hospitals() -> dict:
    return ok([h.model_dump() for h in gis_service.hospitals()])


@router.get(
    "/shelters",
    response_model=ApiResponse[list[GISPointOut]],
    summary="Shelters",
    description="Emergency shelter locations as map points.",
)
def gis_shelters() -> dict:
    return ok([s.model_dump() for s in gis_service.shelters()])


@router.get(
    "/rivers",
    response_model=ApiResponse[list[GISLineOut]],
    summary="Rivers / waterways",
    description="River and waterway segments as geographic poly-lines.",
)
def gis_rivers() -> dict:
    return ok([r.model_dump() for r in gis_service.rivers()])


@router.get(
    "/evacuation-routes",
    response_model=ApiResponse[list[GISLineOut]],
    summary="Evacuation routes",
    description="Evacuation routes as geographic poly-lines.",
)
def gis_evacuation_routes() -> dict:
    return ok([r.model_dump() for r in gis_service.evacuation_routes()])


@router.get(
    "/data",
    response_model=ApiResponse[GISDataOut],
    summary="All GIS base data at once",
    description="Convenience bundle matching the Phase 2 ``GISDataResponse`` contract.",
)
def gis_data() -> dict:
    return ok(gis_service.data().model_dump())


# ---------------------------------------------------------------------------
# Chennai flood layers (validated R outputs, read-only, served on request).
# ---------------------------------------------------------------------------


def _chennai_layer_response(name: str) -> Response:
    """Serve a Chennai GeoJSON layer inside the standard success envelope.

    The stored bytes are wrapped without being parsed or re-serialised, so the
    per-request cost is a byte concatenation rather than JSON work.
    """
    try:
        raw = gis_service.chennai_layer_bytes(name)
    except FileNotFoundError as exc:
        raise AppError(
            404,
            NOT_FOUND,
            "Chennai GIS layer is not available. The R outputs folder is missing or incomplete.",
            details={"layer": name},
        ) from exc
    return Response(content=b'{"success":true,"data":' + raw + b"}", media_type="application/json")


@router.get(
    "/chennai/hazard-categories",
    response_class=Response,
    summary="Chennai source hazard categories",
    description=(
        "Five dissolved source hazard categories as a GeoJSON FeatureCollection (WGS 84). "
        "Source categories, not independently validated."
    ),
)
def gis_chennai_hazard_categories() -> Response:
    return _chennai_layer_response("hazard-categories")


@router.get(
    "/chennai/density-cells",
    response_class=Response,
    summary="Chennai region-by-category density cells",
    description="Fifteen region-by-category cells with survey and 2015 event counts per 100 km2.",
)
def gis_chennai_density_cells() -> Response:
    return _chennai_layer_response("density-cells")


@router.get(
    "/chennai/event-records",
    response_class=Response,
    summary="Chennai 2015 flood-event location records",
    description="2015 flood-event location records (not depth measurements) as GeoJSON points.",
)
def gis_chennai_event_records() -> Response:
    return _chennai_layer_response("event-records")


@router.get(
    "/chennai/survey-depths",
    response_class=Response,
    summary="Chennai observed survey depths",
    description="Surveyed inundation-depth points; depth_m is in metres (converted from inches).",
)
def gis_chennai_survey_depths() -> Response:
    return _chennai_layer_response("survey-depths")