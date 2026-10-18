import React, { useState, useEffect, useRef } from 'react';
import {
  FloodReport,
  Severity,
  ZoneRisk,
  ChennaiCategoryProperties,
  ChennaiDensityCellProperties,
  ChennaiEventRecordProperties,
  ChennaiDepthProperties,
  ChennaiFeatureCollection,
  ChennaiHazardCategory,
  ChennaiRecordStatus,
} from '../types';
import { MapPin, Info, Compass, Layers, Shield, ChevronRight, Globe, RefreshCw, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gisService, ChennaiLayerKey } from '../services/gis';

interface FloodMapProps {
  reports: FloodReport[];
  adminMode?: boolean;
  /** Accepted for existing callers. Risk zones are no longer drawn on this map. */
  zones?: ZoneRisk[];
}

// Chennai study area. The validated outputs cover about 80.10 to 80.33 E and 12.78 to 13.24 N.
const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];
const CHENNAI_ZOOM = 11;
const CHENNAI_AREA = { south: 12.7, north: 13.3, west: 80.0, east: 80.45 };

type MapLayerKey = 'reports' | 'categories' | 'density' | 'events' | 'depths';
type ChennaiMapLayer = Exclude<MapLayerKey, 'reports'>;

const CHENNAI_SOURCE: Record<ChennaiMapLayer, ChennaiLayerKey> = {
  categories: 'hazard-categories',
  density: 'density-cells',
  events: 'event-records',
  depths: 'survey-depths',
};

const LAYER_CONTROLS: { key: MapLayerKey; label: string }[] = [
  { key: 'categories', label: 'Source hazard categories' },
  { key: 'density', label: 'Survey density cells' },
  { key: 'events', label: '2015 event records' },
  { key: 'depths', label: 'Surveyed depths (m)' },
  { key: 'reports', label: 'Flood reports (Chennai)' },
];

const CATEGORY_ORDER: ChennaiHazardCategory[] = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const CATEGORY_FILL: Record<ChennaiHazardCategory, string> = {
  'Very Low': '#D2E9DF',
  Low: '#94C9B0',
  Moderate: '#E7C36C',
  High: '#E0874F',
  'Very High': '#9B2226',
};

const DENSITY_BANDS = [
  { max: 50, color: '#EDE9FE', label: 'Under 50' },
  { max: 150, color: '#C4B5FD', label: '50 to 150' },
  { max: 300, color: '#8B5CF6', label: '150 to 300' },
  { max: Infinity, color: '#5B21B6', label: '300 or more' },
];
const NO_SURVEY_FILL = '#E5E7EB';

const DEPTH_BANDS = [
  { max: 0.3, color: '#BFDBFE', label: 'Under 0.30 m' },
  { max: 0.6, color: '#60A5FA', label: '0.30 to 0.60 m' },
  { max: 1.0, color: '#1D4ED8', label: '0.60 to 1.00 m' },
  { max: Infinity, color: '#1E1B4B', label: '1.00 m or more' },
];

const EVENT_COLOR: Record<ChennaiRecordStatus, string> = {
  single: '#1A2226',
  ambiguous: '#C97A2B',
  outside: '#9CA3AF',
};
const EVENT_LABEL: Record<ChennaiRecordStatus, string> = {
  single: 'Within one hazard category',
  ambiguous: 'Spans more than one category',
  outside: 'Outside mapped category polygons',
};

const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

const bandColor = (bands: { max: number; color: string }[], value: number): string =>
  (bands.find((b) => value < b.max) ?? bands[bands.length - 1]).color;

const inChennaiArea = (lat?: number, lng?: number): boolean =>
  lat !== undefined && lng !== undefined &&
  lat >= CHENNAI_AREA.south && lat <= CHENNAI_AREA.north &&
  lng >= CHENNAI_AREA.west && lng <= CHENNAI_AREA.east;

interface ChennaiLayerOptions<P> {
  path?: (props: P) => L.PathOptions;
  point?: (props: P) => L.CircleMarkerOptions;
  popup: (props: P) => string;
}

function buildGeoLayer<P>(collection: ChennaiFeatureCollection<P>, options: ChennaiLayerOptions<P>): L.GeoJSON {
  return L.geoJSON(collection as unknown as Parameters<typeof L.geoJSON>[0], {
    style: (feature) => (feature && options.path ? options.path(feature.properties as P) : {}),
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, options.point ? options.point(feature.properties as P) : {}),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(options.popup(feature.properties as P), { maxWidth: 280 });
    },
  });
}

// Creates the Leaflet layer once, when its data is first available, then shows or hides it.
function syncGeoLayer<P>(
  map: L.Map | null,
  ref: { current: L.GeoJSON | null },
  collection: ChennaiFeatureCollection<P> | undefined,
  visible: boolean,
  options: ChennaiLayerOptions<P>,
): L.GeoJSON | null {
  if (!map) return null;
  if (!ref.current && collection) {
    ref.current = buildGeoLayer(collection, options);
  }
  const layer = ref.current;
  if (!layer) return null;
  if (visible && !map.hasLayer(layer)) layer.addTo(map);
  if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
  return layer;
}

const categoryPopup = (p: ChennaiCategoryProperties): string => `
  <div class="font-sans text-xs space-y-1 min-w-[200px]">
    <div class="font-bold text-[#1A2226]">${esc(p.category)} (source hazard category)</div>
    <div>Area: ${esc(p.area_km2)} km²</div>
    <div>Surveyed depth points: ${esc(p.survey_points_n)}</div>
    <div>2015 event records: ${esc(p.event_records_n)} (${esc(p.unique_events_present)} unique events)</div>
    <div>Survey points per 100 km² (unadjusted): ${esc(p.survey_per100km2)}</div>
    <div class="pt-1 text-[10px] text-[#5B6B72] italic">${esc(p.data_note)}</div>
  </div>`;

const densityPopup = (p: ChennaiDensityCellProperties): string => `
  <div class="font-sans text-xs space-y-1 min-w-[200px]">
    <div class="font-bold text-[#1A2226]">${esc(p.region)} · ${esc(p.category)}</div>
    <div>Surveyed depth points: ${esc(p.survey_points_n)}</div>
    <div>Survey points per 100 km² (unadjusted): ${esc(p.survey_per100km2)}</div>
    <div>2015 events per 100 km²: ${esc(p.events_per100km2)} (${esc(p.unique_events_present)} unique events)</div>
    <div>Cell status: ${esc(p.cell_status)}</div>
    ${p.survey_points_n === 0 ? '<div class="text-[10px] text-[#5B6B72]">No surveyed points here. This is not evidence of no flooding.</div>' : ''}
    <div class="pt-1 text-[10px] text-[#5B6B72] italic">Densities are not adjusted for survey effort.${String(p.cell_status).includes('small sample') ? ' Small sample: interpret with caution.' : ''}</div>
  </div>`;

const eventPopup = (p: ChennaiEventRecordProperties): string => `
  <div class="font-sans text-xs space-y-1 min-w-[200px]">
    <div class="font-bold text-[#1A2226]">${esc(p.event_name)}</div>
    <div>2015 flood-event location record (not a depth)</div>
    <div>Region: ${esc(p.region_spatial)}</div>
    <div>Hazard category: ${esc(p.category_primary ?? 'outside category polygons')}</div>
    <div>Record status: ${esc(EVENT_LABEL[p.record_status])}</div>
    <div>Records in this event: ${esc(p.records_in_event)}</div>
    <div class="pt-1 text-[10px] text-[#5B6B72] italic">${esc(p.data_note)}</div>
  </div>`;

const depthPopup = (p: ChennaiDepthProperties): string => `
  <div class="font-sans text-xs space-y-1 min-w-[200px]">
    <div class="font-bold text-[#1A2226]">Observed depth: ${Number(p.depth_m).toFixed(2)} m</div>
    <div>Region: ${esc(p.region_spatial)}</div>
    <div>Hazard category: ${esc(p.category_primary ?? 'outside category polygons')}</div>
    ${p.at_minimum_reading ? '<div class="text-[10px] text-[#5B6B72]">At the 5-inch minimum reading, which may be a floor. The true depth may be lower.</div>' : ''}
    <div class="pt-1 text-[10px] text-[#5B6B72] italic">${esc(p.data_note)}</div>
  </div>`;

function LegendRow({ color, label, round = false }: { color: string; label: string; round?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2.5 w-3 shrink-0 border border-[#9CA3AF] ${round ? 'rounded-full' : ''}`}
        style={{ backgroundColor: color }}
      ></span>
      <span className="text-[#5B6B72] text-[8px]">{label}</span>
    </div>
  );
}

export default function FloodMap({ reports, adminMode = false }: FloodMapProps) {
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(null);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string>('all');

  // Layer visibility. A Chennai layer is fetched only when it is switched on.
  const [visibleLayers, setVisibleLayers] = useState<Record<MapLayerKey, boolean>>({
    reports: true,
    categories: true,
    density: false,
    events: true,
    depths: true,
  });

  // Collapsible mobile states for legend and layer controls
  const [legendOpen, setLegendOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);

  // Bumped when a Chennai layer finishes loading, so dependent effects re-run.
  const [, setChennaiLoadCount] = useState(0);
  const categoriesReady = gisService.getChennaiStatus('hazard-categories') === 'ready';
  const densityReady = gisService.getChennaiStatus('density-cells') === 'ready';
  const eventsReady = gisService.getChennaiStatus('event-records') === 'ready';
  const depthsReady = gisService.getChennaiStatus('survey-depths') === 'ready';
  const categoriesStatus = gisService.getChennaiStatus('hazard-categories');

  // Load each Chennai layer on first use, and retry a failed one when it is switched on again.
  useEffect(() => {
    (Object.keys(CHENNAI_SOURCE) as ChennaiMapLayer[]).forEach((layer) => {
      if (!visibleLayers[layer]) return;
      const key = CHENNAI_SOURCE[layer];
      const status = gisService.getChennaiStatus(key);
      if (status === 'ready' || status === 'loading') return;
      gisService.loadChennaiLayer(key).then(() => setChennaiLoadCount((n) => n + 1));
    });
  }, [visibleLayers]);

  // User active location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Map elements refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const categoriesGeoRef = useRef<L.GeoJSON | null>(null);
  const densityGeoRef = useRef<L.GeoJSON | null>(null);
  const eventsGeoRef = useRef<L.GeoJSON | null>(null);
  const depthsGeoRef = useRef<L.GeoJSON | null>(null);
  const studyAreaFittedRef = useRef(false);

  // Filters logic. Reports outside the Chennai study area are not shown on this map.
  const filteredReports = reports.filter(r => {
    if (!inChennaiArea(r.latitude, r.longitude)) return false;
    if (activeSeverityFilter === 'all') {
      return adminMode ? true : r.status !== 'resolved';
    }
    return r.severity === activeSeverityFilter && (adminMode ? true : r.status !== 'resolved');
  });

  const getSeverityStyle = (severity: Severity) => {
    switch (severity) {
      case 'critical': return 'bg-[#7F1D1D]/20 border-[#7F1D1D]/50 text-[#7F1D1D] font-black animate-pulse';
      case 'high': return 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]';
      case 'medium': return 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]';
      case 'low': return 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]';
    }
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'critical': return '#7F1D1D';
      case 'high': return '#B23B2E';
      case 'medium': return '#C97A2B';
      case 'low': return '#2E7D5B';
    }
  };

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: CHENNAI_CENTER,
        zoom: CHENNAI_ZOOM,
        minZoom: 9,
        maxZoom: 18,
        scrollWheelZoom: true,
        zoomControl: true,
      });

      // CartoDB Positron: Beautiful, elegant, lightweight dashboard design canvas
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
      // Draw order: later groups sit on top.
      markersLayerRef.current = L.layerGroup().addTo(map);
      userLocationLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        userLocationLayerRef.current = null;
        categoriesGeoRef.current = null;
        densityGeoRef.current = null;
        eventsGeoRef.current = null;
        depthsGeoRef.current = null;
        studyAreaFittedRef.current = false;
      }
    };
  }, []);

  // Source hazard categories. Fit the study area the first time they are drawn.
  useEffect(() => {
    const layer = syncGeoLayer(
      mapInstanceRef.current,
      categoriesGeoRef,
      gisService.getChennaiLayer<ChennaiCategoryProperties>('hazard-categories'),
      visibleLayers.categories,
      {
        path: (p) => ({
          color: '#374151',
          weight: 0.6,
          opacity: 0.7,
          fillColor: CATEGORY_FILL[p.category] ?? '#9CA3AF',
          fillOpacity: 0.45,
        }),
        popup: categoryPopup,
      },
    );
    const map = mapInstanceRef.current;
    if (map && layer && !studyAreaFittedRef.current && layer.getBounds().isValid()) {
      map.fitBounds(layer.getBounds(), { padding: [24, 24] });
      studyAreaFittedRef.current = true;
    }
  }, [visibleLayers.categories, categoriesReady]);

  // Survey density cells, coloured by surveyed points per 100 km2 (unadjusted for effort).
  useEffect(() => {
    syncGeoLayer(
      mapInstanceRef.current,
      densityGeoRef,
      gisService.getChennaiLayer<ChennaiDensityCellProperties>('density-cells'),
      visibleLayers.density,
      {
        path: (p) => {
          if (!p.survey_points_n) {
            return { color: '#6B7280', weight: 1, dashArray: '3, 3', fillColor: NO_SURVEY_FILL, fillOpacity: 0.6 };
          }
          const small = String(p.cell_status).includes('small sample');
          return {
            color: '#4C1D95',
            weight: 1,
            dashArray: small ? '2, 4' : undefined,
            fillColor: bandColor(DENSITY_BANDS, p.survey_per100km2),
            fillOpacity: 0.55,
          };
        },
        popup: densityPopup,
      },
    );
  }, [visibleLayers.density, densityReady]);

  // 2015 event location records. Points, not depths.
  useEffect(() => {
    syncGeoLayer(
      mapInstanceRef.current,
      eventsGeoRef,
      gisService.getChennaiLayer<ChennaiEventRecordProperties>('event-records'),
      visibleLayers.events,
      {
        point: (p) => ({
          radius: 4,
          color: '#FFFFFF',
          weight: 1,
          fillColor: EVENT_COLOR[p.record_status] ?? EVENT_COLOR.outside,
          fillOpacity: 0.9,
        }),
        popup: eventPopup,
      },
    );
  }, [visibleLayers.events, eventsReady]);

  // Observed survey depths in metres, banded.
  useEffect(() => {
    syncGeoLayer(
      mapInstanceRef.current,
      depthsGeoRef,
      gisService.getChennaiLayer<ChennaiDepthProperties>('survey-depths'),
      visibleLayers.depths,
      {
        point: (p) => ({
          radius: 5,
          color: '#FFFFFF',
          weight: 1,
          fillColor: bandColor(DEPTH_BANDS, p.depth_m),
          fillOpacity: 0.95,
        }),
        popup: depthPopup,
      },
    );
  }, [visibleLayers.depths, depthsReady]);

  // Update Report Markers (Including Custom Cluster logic)
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!mapInstanceRef.current || !markersLayer) return;

    markersLayer.clearLayers();
    if (!visibleLayers.reports) return;

    // Custom clustering: group reports by approximate coordinates (to 4 decimal places)
    const coordinateGroups: { [key: string]: FloodReport[] } = {};
    filteredReports.forEach(report => {
      const lat = report.latitude ?? CHENNAI_CENTER[0];
      const lng = report.longitude ?? CHENNAI_CENTER[1];
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (!coordinateGroups[key]) {
        coordinateGroups[key] = [];
      }
      coordinateGroups[key].push(report);
    });

    Object.keys(coordinateGroups).forEach(key => {
      const group = coordinateGroups[key];
      const [latStr, lngStr] = key.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      // Determine highest severity in the cluster
      const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
      let topSeverity: Severity = 'low';
      for (const sev of severityOrder) {
        if (group.some(r => r.severity === sev)) {
          topSeverity = sev;
          break;
        }
      }

      const topColor = getSeverityColor(topSeverity);
      const isMulti = group.length > 1;

      // Render custom high-contrast HTML elements with Tailwind
      const clusterHtml = isMulti
        ? `
          <div class="relative flex items-center justify-center rounded-full bg-white shadow-lg border-2 border-white text-white font-bold text-xs" style="background-color: ${topColor}; width: 34px; height: 34px;">
            <span class="z-10">${group.length}</span>
            <span class="absolute inset-0 block h-full w-full rounded-full bg-black/10 animate-pulse"></span>
            ${topSeverity === 'critical' ? `<span class="absolute -inset-1.5 block rounded-full bg-[#7F1D1D]/20 animate-ping -z-10"></span>` : ''}
          </div>
        `
        : `
          <div class="relative flex items-center justify-center rounded-full bg-white shadow-md border-2 border-[#E2E4E1] text-white" style="background-color: ${topColor}; width: 28px; height: 28px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            ${topSeverity === 'critical' ? `<span class="absolute -inset-1.5 block rounded-full bg-[#7F1D1D]/25 animate-ping -z-10"></span>` : ''}
            ${topSeverity === 'high' ? `<span class="absolute -inset-1.5 block rounded-full bg-[#B23B2E]/20 animate-pulse -z-10"></span>` : ''}
          </div>
        `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: clusterHtml,
        iconSize: isMulti ? [34, 34] : [28, 28],
        iconAnchor: isMulti ? [17, 17] : [14, 28]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Create a neat list inside the popup if clustered
      let popupContent = `<div class="font-sans text-xs p-1 min-w-[220px] max-w-[260px] space-y-3">`;
      if (isMulti) {
        popupContent += `
          <div class="border-b pb-1.5 mb-1.5 flex justify-between items-center">
            <span class="font-extrabold text-[#1A2226] text-[10px] uppercase tracking-wider">Hazard Cluster (${group.length} Incidents)</span>
            <span class="text-[8px] font-bold px-1.5 py-0.2 bg-gray-100 text-gray-700 border uppercase">Sector Spot</span>
          </div>
          <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        `;
        group.forEach(report => {
          popupContent += `
            <div class="p-2 border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer rounded-none" id="popup-report-item-${report.id}">
              <div class="flex justify-between items-center mb-1">
                <span class="font-mono font-bold text-gray-900">${report.id}</span>
                <span class="text-[8px] font-black px-1 rounded uppercase tracking-wide" style="background-color: ${getSeverityColor(report.severity)}15; color: ${getSeverityColor(report.severity)}; border: 1px solid ${getSeverityColor(report.severity)}30">${report.severity}</span>
              </div>
              <div class="font-medium text-gray-800 leading-tight">${report.location}</div>
              <div class="text-[9px] text-gray-500 font-mono mt-1">Gauge: ${report.waterLevelDepth || "N/A"} | ${report.status}</div>
            </div>
          `;
        });
        popupContent += `</div>`;
      } else {
        const r = group[0];
        popupContent += `
          <div class="border-b pb-1.5 flex justify-between items-center">
            <span class="font-mono font-black text-gray-900 text-xs">${r.id}</span>
            <span class="text-[9px] font-bold px-2 py-0.5 border uppercase tracking-wider ${
              r.severity === 'critical' ? 'bg-[#7F1D1D]/10 border-[#7F1D1D]/30 text-[#7F1D1D] font-extrabold animate-pulse' :
              r.severity === 'high' ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' :
              r.severity === 'medium' ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' :
              'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
            }">${r.severity}</span>
          </div>
          <div class="space-y-1">
            <div class="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Reported Landmark</div>
            <div class="font-bold text-gray-900 leading-snug">${r.location}</div>
          </div>
          <div class="grid grid-cols-2 gap-2 py-1">
            <div>
              <span class="text-[9px] text-gray-400 font-bold block uppercase">Water Depth</span>
              <span class="font-mono font-bold text-gray-800">${r.waterLevelDepth || "Not gauged"}</span>
            </div>
            <div>
              <span class="text-[9px] text-gray-400 font-bold block uppercase">Log Status</span>
              <span class="font-bold text-gray-800 capitalize text-[10px] inline-flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full ${r.status === 'verified' ? 'bg-[#2E7D5B]' : 'bg-[#C97A2B]'}"></span>
                ${r.status}
              </span>
            </div>
          </div>
          <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[9px] text-gray-400 font-mono">
            <span>${r.date}</span>
            <span>By: ${r.reporterName}</span>
          </div>
        `;
      }
      popupContent += `</div>`;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: 'custom-leaflet-popup'
      });

      // Marker selection trigger
      marker.on('click', () => {
        setSelectedReport(group[0]);
      });

      // Special popup click interceptor to select correct report in sidebar
      marker.on('popupopen', () => {
        if (isMulti) {
          group.forEach(report => {
            const el = document.getElementById(`popup-report-item-${report.id}`);
            if (el) {
              el.onclick = (e) => {
                e.stopPropagation();
                setSelectedReport(report);
              };
            }
          });
        }
      });

      marker.addTo(markersLayer);
    });
  }, [filteredReports]);

  // Update User Location layer and map center
  useEffect(() => {
    const map = mapInstanceRef.current;
    const userLayer = userLocationLayerRef.current;
    if (!map || !userLayer) return;

    userLayer.clearLayers();

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-gps-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="h-4.5 w-4.5 rounded-full bg-[#1B4B66] border-2 border-white shadow-md z-10"></div>
            <span class="absolute h-9 w-9 rounded-full bg-[#1B4B66]/30 animate-ping -z-10"></span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindTooltip("Your Current Location", { permanent: false, direction: 'top' });
      userMarker.addTo(userLayer);

      // Smoothly fly to the citizen location
      map.flyTo([userLocation.lat, userLocation.lng], 14, { animate: true, duration: 1.5 });
    }
  }, [userLocation]);

  // Geolocation trigger function
  const handleQueryUserLocation = () => {
    setIsLocatingUser(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this web browser.");
      setIsLocatingUser(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setIsLocatingUser(false);
      },
      (err) => {
        console.error(err);
        setLocationError("Unable to acquire live GPS coordinates. Check permissions.");
        setIsLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const layerStatusText = (key: MapLayerKey): string => {
    if (key === 'reports') return '';
    const status = gisService.getChennaiStatus(CHENNAI_SOURCE[key]);
    if (status === 'loading') return ' (loading…)';
    if (status === 'error') return ' (unavailable)';
    return '';
  };

  return (
    <div className="space-y-6 animate-fade-in" id="flood-map-view">

      {/* 1. Header Navigation and Filters */}
      <div className="border-b border-[#E2E4E1] pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
            <Compass size={16} className="text-[#1B4B66]" />
            <span>{adminMode ? 'Chennai Flood Hazard GIS · EOC View' : 'Chennai Flood Hazard GIS Map'}</span>
          </h2>
          <p className="text-xs text-[#5B6B72] mt-0.5">
            Source hazard categories, 2015 flood-event records, surveyed depths in metres and region density cells.
            Read-only outputs of the R analysis. Not a flood forecast.
          </p>
        </div>

        {/* Actions Controls */}
        <div className="flex flex-wrap items-center gap-2">

          {/* User Location trigger */}
          <button
            onClick={handleQueryUserLocation}
            disabled={isLocatingUser}
            className="text-[10px] font-bold border border-[#E2E4E1] px-2.5 py-1.5 bg-white text-[#1B4B66] hover:bg-[#F5F6F4] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Pinpoint your current location on the active map grid"
          >
            {isLocatingUser ? (
              <RefreshCw size={12} className="animate-spin text-[#1B4B66]" />
            ) : (
              <Navigation size={12} className="text-[#1B4B66]" />
            )}
            <span>{isLocatingUser ? 'Locating...' : 'My Location'}</span>
          </button>

          <select
            value={activeSeverityFilter}
            onChange={(e) => {
              setActiveSeverityFilter(e.target.value);
              setSelectedReport(null);
            }}
            className="text-[11px] font-bold border border-[#E2E4E1] px-2.5 py-1.5 bg-white text-[#1A2226] focus:outline-none uppercase tracking-wider rounded-none cursor-pointer"
          >
            <option value="all">Reports: All Severities</option>
            <option value="critical">Severity: Critical Only</option>
            <option value="high">Severity: High Only</option>
            <option value="medium">Severity: Medium Only</option>
            <option value="low">Severity: Low Only</option>
          </select>
        </div>
      </div>

      {locationError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <Info size={14} />
          <span>{locationError}</span>
        </div>
      )}

      {/* 2. Interactive Map & Selected Details Container */}
      <div className="grid gap-6 lg:grid-cols-4">

        {/* Map Column */}
        <div className="lg:col-span-3 bg-white border border-[#E2E4E1] p-1.5 relative shadow-sm overflow-hidden">

          {/* Legend overlay — collapsible on mobile */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-40 bg-white/95 border border-[#E2E4E1] shadow-md pointer-events-auto max-w-[180px] sm:max-w-[210px]">
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="w-full flex items-center justify-between p-2 sm:p-3 text-[9px] font-bold text-[#1A2226] uppercase tracking-wider cursor-pointer sm:cursor-default sm:pointer-events-none"
            >
              <span>Legend</span>
              <ChevronDown size={12} className={`sm:hidden transition-transform ${legendOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`space-y-3 text-[9px] leading-relaxed p-2 sm:p-3 pt-0 sm:pt-0 max-h-[260px] overflow-y-auto ${legendOpen ? 'block' : 'hidden'} sm:block`}>

              {visibleLayers.categories && (
                <div className="space-y-1">
                  <span className="text-[8px] font-extrabold text-[#1A2226] uppercase tracking-wider block">Source hazard category</span>
                  {CATEGORY_ORDER.map(cat => (
                    <React.Fragment key={cat}>
                      <LegendRow color={CATEGORY_FILL[cat]} label={cat} />
                    </React.Fragment>
                  ))}
                  <span className="text-[#5B6B72]/80 text-[8px] block">Not independently validated</span>
                </div>
              )}

              {visibleLayers.density && (
                <div className="space-y-1">
                  <span className="text-[8px] font-extrabold text-[#1A2226] uppercase tracking-wider block">Survey points per 100 km²</span>
                  {DENSITY_BANDS.map(b => (
                    <React.Fragment key={b.label}>
                      <LegendRow color={b.color} label={b.label} />
                    </React.Fragment>
                  ))}
                  <LegendRow color={NO_SURVEY_FILL} label="No surveyed points" />
                  <span className="text-[#5B6B72]/80 text-[8px] block">Unadjusted for survey effort</span>
                </div>
              )}

              {visibleLayers.events && (
                <div className="space-y-1">
                  <span className="text-[8px] font-extrabold text-[#1A2226] uppercase tracking-wider block">2015 event records</span>
                  <LegendRow color={EVENT_COLOR.single} label={EVENT_LABEL.single} round />
                  <LegendRow color={EVENT_COLOR.ambiguous} label={EVENT_LABEL.ambiguous} round />
                  <LegendRow color={EVENT_COLOR.outside} label={EVENT_LABEL.outside} round />
                  <span className="text-[#5B6B72]/80 text-[8px] block">Locations, not depths</span>
                </div>
              )}

              {visibleLayers.depths && (
                <div className="space-y-1">
                  <span className="text-[8px] font-extrabold text-[#1A2226] uppercase tracking-wider block">Observed depth (m)</span>
                  {DEPTH_BANDS.map(b => (
                    <React.Fragment key={b.label}>
                      <LegendRow color={b.color} label={b.label} round />
                    </React.Fragment>
                  ))}
                  <span className="text-[#5B6B72]/80 text-[8px] block">Surveyed points only</span>
                </div>
              )}

              {visibleLayers.reports && (
                <div className="space-y-1">
                  <span className="text-[8px] font-extrabold text-[#1A2226] uppercase tracking-wider block">Flood reports (Chennai)</span>
                  <LegendRow color={getSeverityColor('critical')} label="Critical" round />
                  <LegendRow color={getSeverityColor('high')} label="High" round />
                  <LegendRow color={getSeverityColor('medium')} label="Medium" round />
                  <LegendRow color={getSeverityColor('low')} label="Low" round />
                </div>
              )}
            </div>
          </div>

          {/* GIS Layer Controls Panel — collapsible on mobile */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 bg-white/95 border border-[#E2E4E1] shadow-md min-w-[130px] sm:min-w-[150px] max-w-[200px] pointer-events-auto text-xs">
            <button
              onClick={() => setLayersOpen(!layersOpen)}
              className="w-full flex items-center justify-between p-2 sm:p-3 text-[9px] font-bold text-[#1A2226] uppercase tracking-wider cursor-pointer sm:cursor-default sm:pointer-events-none"
            >
              <span>Map Layers</span>
              <ChevronDown size={12} className={`sm:hidden transition-transform ${layersOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`space-y-1 p-2 sm:p-3 pt-0 sm:pt-0 ${layersOpen ? 'block' : 'hidden'} sm:block`}>
              {LAYER_CONTROLS.map(layer => (
                <label key={layer.key} className="flex items-center gap-1.5 cursor-pointer py-0.5 hover:bg-gray-100/60 px-1 rounded-sm select-none">
                  <input
                    type="checkbox"
                    checked={visibleLayers[layer.key]}
                    onChange={() => setVisibleLayers(prev => ({ ...prev, [layer.key]: !prev[layer.key] }))}
                    className="accent-[#1B4B66] h-3 w-3"
                  />
                  <span className="text-[10px] text-gray-700 font-semibold">
                    {layer.label}
                    <span className="text-[#B23B2E] font-normal">{layerStatusText(layer.key)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Map canvas container */}
          <div
            ref={mapContainerRef}
            className="w-full h-[300px] sm:h-[400px] md:h-[480px] border border-[#E2E4E1]/80 relative z-30"
            id="interactive-leaflet-map"
          >
            {/* Chennai GIS loading screen */}
            {(categoriesStatus === 'idle' || categoriesStatus === 'loading') && (
              <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center space-y-3 z-[1000]">
                <RefreshCw className="animate-spin text-[#1B4B66]" size={28} />
                <span className="text-xs font-mono text-[#5B6B72] uppercase tracking-wider">Loading Chennai GIS layers...</span>
              </div>
            )}
            {/* Chennai GIS unavailable screen */}
            {categoriesStatus === 'error' && (
              <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center space-y-2 z-[1000] px-6 text-center">
                <svg className="text-[#B23B2E]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span className="text-xs font-mono text-[#B23B2E] uppercase tracking-wider font-bold">Chennai GIS layers unavailable</span>
                <span className="text-[10px] text-[#5B6B72]">The backend could not return the validated Chennai layers. Check that the backend is running and the R outputs folder is present.</span>
              </div>
            )}
          </div>

          {/* Standing caveats: shown with every view of the map */}
          <div
            id="chennai-gis-caveats"
            className="mt-2 border border-[#E2E4E1] bg-[#F5F6F4] p-2.5 text-[10px] text-[#5B6B72] leading-relaxed space-y-1"
          >
            <div className="font-bold uppercase tracking-wider text-[#1A2226]">Read before interpreting</div>
            <p>Hazard categories are source categories from the R analysis and are not independently validated. No flood prediction or probability is shown.</p>
            <p>2015 event records are locations, not depth measurements. A missing record is not evidence of no flooding.</p>
            <p>Depths are surveyed points only, converted from inches to metres. The 5-inch minimum reading may be a floor.</p>
            <p>Densities are not adjusted for survey effort. Very High has no surveyed depth points, which is not evidence of no flooding there.</p>
          </div>
        </div>

        {/* Selected Incident Sidebar */}
        <div className="bg-white border border-[#E2E4E1] p-4 flex flex-col justify-between shadow-sm lg:col-span-1">
          <div>
            <div className="border-b border-[#E2E4E1] pb-2 mb-3">
              <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
                Selected Incident Data
              </span>
            </div>

            {selectedReport ? (
              <div className="space-y-4 text-xs" id="map-selected-report-details">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#1A2226] bg-[#F5F6F4] px-1.5 py-0.5 border border-[#E2E4E1]">
                    {selectedReport.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider ${getSeverityStyle(selectedReport.severity)}`}>
                    {selectedReport.severity}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Reported Location:</span>
                  <div className="font-bold text-[#1A2226]">{selectedReport.location}</div>
                </div>

                {selectedReport.latitude !== undefined && selectedReport.longitude !== undefined && (
                  <div className="grid grid-cols-2 gap-2 bg-[#F5F6F4] p-1.5 border border-[#E2E4E1] font-mono text-[9px] text-gray-600">
                    <div>Lat: {selectedReport.latitude.toFixed(5)}</div>
                    <div>Lng: {selectedReport.longitude.toFixed(5)}</div>
                  </div>
                )}

                <div className="space-y-0.5">
                  <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Water Depth Gauge:</span>
                  <div className="font-mono font-bold text-[#1A2226]">{selectedReport.waterLevelDepth || "Not gauged"}</div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] text-[#5B6B72] font-mono block uppercase">Audit Statement:</span>
                  <p className="text-[#5B6B72] italic leading-normal bg-[#F5F6F4] p-2.5 border border-[#E2E4E1] text-[11px]">
                    "{selectedReport.description}"
                  </p>
                </div>

                {selectedReport.photoUrl && (
                  <div className="border border-[#E2E4E1] p-1 bg-[#F5F6F4]">
                    <img
                      src={selectedReport.photoUrl}
                      alt={`Flood evidence photo at ${selectedReport.location}`}
                      className="w-full h-24 object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[#5B6B72] text-xs space-y-2">
                <Compass className="mx-auto text-[#E2E4E1]" size={28} />
                <p className="text-[#5B6B72]">Click any feature on the map to inspect its details.</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#E2E4E1] pt-3 mt-4 text-[10px] text-[#5B6B72] leading-normal">
            <div className="flex gap-1.5 items-start">
              <Info size={14} className="text-[#1B4B66] shrink-0 mt-0.5" />
              <span>
                Scroll to zoom and drag to pan across the Chennai study area. Layers load when switched on.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
