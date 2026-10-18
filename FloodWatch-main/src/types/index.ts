/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FloodWatch — Centralized Types & API Contracts
 *
 * This file defines all domain types, request/response payloads,
 * and API endpoint contracts for the FloodWatch frontend.
 *
 * When the backend is implemented, these contracts should be
 * replaced with generated types from the OpenAPI spec or
 * manually updated to match the real API.
 */

// ============================================================
// CORE DOMAIN ENUMS
// ============================================================

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'verified' | 'resolved';
export type UserRole = 'citizen' | 'admin';
export type ForecastRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type NotificationType = 'alert' | 'update' | 'system' | 'report';
export type FundCategory = 'Emergency Relief' | 'Road Repair' | 'Drainage' | 'Medical' | 'Rehabilitation';
export type GISLayerType = 'reports' | 'zones' | 'roads' | 'hospitals' | 'shelters' | 'rivers' | 'evacuation';
export type ForecastTimeWindow = '6 hours' | '12 hours' | '24 hours' | '48 hours';

// ============================================================
// AUTH CONTRACTS
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginRequest {
  email?: string;
  passcode?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LogoutResponse {
  success: boolean;
}

// ============================================================
// FLOOD REPORT CONTRACTS
// ============================================================

export interface FloodReport {
  id: string;
  userId?: string;
  location: string;
  severity: Severity;
  description: string;
  date: string;
  status: ReportStatus;
  reporterName: string;
  phone: string;
  photoUrl?: string;
  waterLevelDepth?: string;
  adminNotes?: string;
  latitude?: number;
  longitude?: number;
  verifiedAt?: string;
  resolvedAt?: string;
}

export interface CreateFloodReportRequest {
  location: string;
  latitude: number;
  longitude: number;
  severity: Severity;
  description: string;
  reporterName: string;
  phone: string;
  photoUrl?: string;
  waterLevelDepth?: string;
}

export interface UpdateReportRequest {
  status?: ReportStatus;
  adminNotes?: string;
  severity?: Severity;
}

export interface VerifyReportRequest {
  verifiedBy: string;
  notes?: string;
}

export interface ResolveReportRequest {
  resolvedBy: string;
  resolutionNotes: string;
}

// ============================================================
// FORECAST CONTRACTS
// ============================================================

export interface FloodForecastPoint {
  timeWindow: ForecastTimeWindow;
  riskLevel: ForecastRiskLevel;
  predictedWaterLevel?: number;
  confidence?: number;
  timestamp: string;
  location: string;
  notes: string;
}

export interface ForecastRequest {
  locationId: string;
  timeWindows?: ForecastTimeWindow[];
}

export interface ForecastResponse {
  location: string;
  forecasts: FloodForecastPoint[];
  generatedAt: string;
}

// ============================================================
// NOTIFICATION CONTRACTS
// ============================================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: Severity;
  type: NotificationType;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

// ============================================================
// ALERT CONTRACTS
// ============================================================

export interface Alert {
  id: string;
  message: string;
  severity: Severity;
  zone?: string;
  createdAt: string;
  active: boolean;
  createdBy?: string;
}

export interface CreateAlertRequest {
  message: string;
  severity: Severity;
  zone?: string;
}

// ============================================================
// ZONE / GIS CONTRACTS
// ============================================================

export interface ZoneRisk {
  id: string;
  name: string;
  riskLevel: Severity;
  priorityScore: number;
  activeReportsCount: number;
  lastUpdated: string;
  center?: [number, number];
  radius?: number;
}

export interface GISPoint {
  name: string;
  lat: number;
  lng: number;
}

export interface GISLine {
  name: string;
  path: [number, number][];
}

export interface GISZone {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  riskLevel: Severity;
  priorityScore: number;
}

export interface GISLayer {
  id: string;
  name: string;
  type: GISLayerType;
  visible: boolean;
  data: (GISPoint | GISLine)[];
}

export interface GISDataResponse {
  roads: GISLine[];
  hospitals: GISPoint[];
  shelters: GISPoint[];
  rivers: GISLine[];
  evacuationRoutes: GISLine[];
}

// ============================================================
// CHENNAI FLOOD LAYERS (validated R outputs, served read-only)
// Source categories are not independently validated. No flood
// prediction or probability is represented in these types.
// ============================================================

export type ChennaiHazardCategory = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';

export type ChennaiRecordStatus = 'single' | 'ambiguous' | 'outside';

export interface ChennaiGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: ChennaiGeometry[];
}

export interface ChennaiFeature<P> {
  type: 'Feature';
  geometry: ChennaiGeometry;
  properties: P;
}

export interface ChennaiFeatureCollection<P> {
  type: 'FeatureCollection';
  name?: string;
  features: ChennaiFeature<P>[];
}

export interface ChennaiCategoryProperties {
  category: ChennaiHazardCategory;
  category_order: number;
  area_km2: number;
  survey_points_n: number;
  survey_per100km2: number;
  event_records_n: number;
  unique_events_present: number;
  events_per100km2: number;
  data_note: string;
}

export interface ChennaiDensityCellProperties {
  region: string;
  category: ChennaiHazardCategory;
  category_order: number;
  area_km2: number;
  survey_points_n: number;
  unique_events_present: number;
  survey_per100km2: number;
  events_per100km2: number;
  cell_status: string;
}

export interface ChennaiEventRecordProperties {
  event_id: number;
  event_name: string;
  region_spatial: string;
  record_status: ChennaiRecordStatus;
  category_primary: ChennaiHazardCategory | null;
  categories_hit: string;
  records_in_event: number;
  data_note: string;
}

export interface ChennaiDepthProperties {
  depth_m: number;
  depth_inches: number;
  at_minimum_reading: boolean;
  region_spatial: string;
  record_status: ChennaiRecordStatus;
  category_primary: ChennaiHazardCategory | null;
  categories_hit: string;
  distinct_events_within_500m: number;
  data_note: string;
}

// ============================================================
// FUNDS CONTRACTS
// ============================================================

export interface FundAllocation {
  id: string;
  zoneName: string;
  category: FundCategory;
  amount: number;
  date: string;
  reason: string;
}

export interface FundBalance {
  availableBalance: number;
  allocatedAmount: number;
  remainingBalance: number;
}

export interface FundTransaction {
  transactionId: string;
  zone: string;
  category: FundCategory;
  amount: number;
  reason: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'completed';
}

export interface AllocateFundRequest {
  zoneName: string;
  category: FundCategory;
  amount: number;
  reason: string;
}

export interface AllocateFundResponse {
  success: boolean;
  transaction?: FundTransaction;
  remainingBalance: number;
  error?: string;
}

// ============================================================
// ANALYTICS CONTRACTS
// ============================================================

export interface SystemStats {
  activeReports: number;
  highRiskZones: number;
  pendingVerifications: number;
  availableFunds: number;
}

export interface AnalyticsOverview {
  totalReports: number;
  resolvedReports: number;
  activeZones: number;
  treasuryBalance: number;
  reportsTrend: AnalyticsDataPoint[];
}

export interface AnalyticsDataPoint {
  label: string;
  totalReports: number;
  unresolvedReports: number;
  verifiedReports: number;
  criticalSeverityCount: number;
}

export interface SeverityDistributionMetric {
  name: string;
  value: number;
}

export interface AreaStats {
  zoneName: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AnalyticsIncidentsResponse {
  dailySeries: AnalyticsDataPoint[];
  weeklySeries: AnalyticsDataPoint[];
  monthlySeries: AnalyticsDataPoint[];
}

export interface AnalyticsSeverityResponse {
  distribution: SeverityDistributionMetric[];
  total: number;
}

export interface AnalyticsAreasResponse {
  areas: AreaStats[];
}

export interface AnalyticsFundsResponse {
  totalBudget: number;
  allocated: number;
  remaining: number;
  transactions: FundTransaction[];
}

export interface ResponseStats {
  totalReports: number;
  resolvedReports: number;
  verifiedReports: number;
  resolutionRate: number;
  insufficientData: boolean;
  avgResolutionMinutes: number;
  avgVerificationMinutes: number;
}

export interface ForecastVsActual {
  zoneId: string;
  zoneName: string;
  forecastRisk: Severity;
  predictedWaterLevel: number;
  waterLevelStatus: 'exceeded' | 'within' | 'under';
  waterLevelDelta: number;
  actualDepth: number;
  hasActual: boolean;
}

export interface AnalyticsDetailsResponse {
  responseStats: ResponseStats;
  forecastVsActual: ForecastVsActual[];
}

// ============================================================
// PRIORITY CONTRACTS
// ============================================================

export interface PriorityFactor {
  name: string;
  value: number;
}

export interface PriorityZone {
  zoneId: string;
  zoneName: string;
  score: number;
  riskLevel: Severity;
  reportCount: number;
  factors: PriorityFactor[];
  recommendedAction: string;
}

export interface PriorityFactorsConfig {
  floodSeverityWeight: number;
  infrastructureRiskWeight: number;
  populationDensityWeight: number;
  roadAccessWeight: number;
}

export interface PriorityZonesResponse {
  zones: PriorityZone[];
  config: PriorityFactorsConfig;
  calculatedAt: string;
}

// ============================================================
// GENERIC API RESPONSE WRAPPERS
// ============================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}
