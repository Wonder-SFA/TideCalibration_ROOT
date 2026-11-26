export type LandmarkState = 'exposed' | 'waterline' | 'submerged' | 'na';

export type TideStage = 'low' | 'rising' | 'mid' | 'falling' | 'high';

export type UnitSystem = 'metric' | 'imperial';

export interface LandmarkDef {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface TideEvent {
  id: string;
  type: 'high' | 'low';
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm
  timestampMs: number;
  heightM: number;
  heightFt?: number;
}

export interface CalibrationSpot {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  baselineName: string;
  baselineUrl: string;
  baselineSourceType: 'tide-forecast' | 'manual';
  landmarks: LandmarkDef[];
  events: TideEvent[];
  lastFetchedAt?: string;
  createdAt: string;
}

export interface Observation {
  id: string;
  spotId: string;
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm:ss
  timestampMs: number;
  exifVerified: boolean;
  exifLatitude?: number;
  exifLongitude?: number;
  stage: TideStage;
  levelPercent: number; // 0 (lowest low) .. 100 (highest high)
  landmarkStates: Record<string, LandmarkState>;
  photoIds: string[];
  notes: string;
  createdAt: string;
}

export interface StoredPhoto {
  id: string;
  spotId: string;
  observationId: string;
  filename: string;
  mimeType: string;
  blob: Blob;
  exifTimestamp?: string;
  createdAt: string;
}

export interface AppSettings {
  id: 'app';
  customProxyUrl: string;
  units: UnitSystem;
  activeSpotId: string;
}

export interface InterpolatedTide {
  heightM: number;
  normalizedLevel: number; // 0..1
  slope: 'rising' | 'falling' | 'slack';
  prevEvent: TideEvent | null;
  nextEvent: TideEvent | null;
  nearestEvent: TideEvent | null;
}

export interface LandmarkThreshold {
  landmarkId: string;
  name: string;
  exposedCount: number;
  waterlineCount: number;
  submergedCount: number;
  maxExposedPct: number | null;
  waterlinePct: number | null;
  minSubmergedPct: number | null;
}

export interface ObservationResidual {
  observationId: string;
  predictedPct: number;
  observedPct: number;
  errorPct: number;
}

export interface CalibrationResult {
  observationCount: number;
  bestOffsetMinutes: number | null;
  altInversionMinutes: number | null;
  ambiguousInversion: boolean;
  confidence: 'none' | 'preliminary' | 'moderate' | 'high';
  solverStage: 'none' | 'stage1-6h' | 'stage2-12h';
  searchWindowHours: 0 | 6 | 12;
  stageNote: string | null;
  rmsErrorPct: number | null;
  perObservationResiduals: Record<string, ObservationResidual>;
  landmarkThresholds: LandmarkThreshold[];
  summaryFormula: string;
}

export interface CaptureRecommendation {
  id: string;
  category: 'bracket' | 'slope-check' | 'lag-confirm' | 'spring-neap';
  title: string;
  targetLocalDate: string;
  targetLocalTime: string;
  targetTimestampMs: number;
  reason: string;
  completed: boolean;
}

// Extensible adapters for future coordinate APIs or Gemini Vision assist
export interface TideSourceAdapter {
  id: string;
  label: string;
  fetchEvents(query: { url?: string; lat?: number; lon?: number }): Promise<{
    locationName: string;
    events: TideEvent[];
  }>;
}

export interface PhotoAnalyzer {
  id: string;
  label: string;
  analyze(
    photo: File,
    landmarks: LandmarkDef[]
  ): Promise<{
    suggestedStage?: TideStage;
    suggestedLevelPercent?: number;
    suggestedLandmarks?: Record<string, LandmarkState>;
    notes?: string;
  }>;
}
