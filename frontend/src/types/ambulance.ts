/**
 * Ambulance / Emergency TypeScript types.
 * Mirrors the backend DTOs in ambulance-service exactly.
 */

// ─── Status Enums ────────────────────────────────────────────────────────────

export type EmergencyStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'PATIENT_PICKED'
  | 'HOSPITAL_REACHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type AmbulanceStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'PATIENT_TRANSPORTING'
  | 'UNAVAILABLE';

export type OperatorStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNAVAILABLE';

// ─── Response DTOs ────────────────────────────────────────────────────────────

/** Mirrors OperatorResponse.java */
export interface OperatorInfo {
  id: number;
  userId: number;
  name: string;
  phone: string;
  status: OperatorStatus;
}

/** Mirrors AmbulanceResponse.java */
export interface AmbulanceInfo {
  id: number;
  registrationNumber: string;
  vehicleType: string;
  status: AmbulanceStatus;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string | null;
  operatorId?: number;
  operatorName?: string;
}

/** Mirrors EmergencyResponse.java */
export interface EmergencyRequest {
  id: number;
  patientId: number;
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  emergencyDescription: string;
  status: EmergencyStatus;
  ambulanceId?: number | null;
  assignmentId?: number | null;
  distanceKm?: number | null;
  assignedAmbulance?: AmbulanceInfo;
  assignedOperator?: OperatorInfo;
  hospitalName?: string;
  hospitalAddress?: string;
  estimatedArrivalMinutes?: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// ─── Status Machine Helpers ───────────────────────────────────────────────────

/** Returns the next valid operator-controlled status transition, or null if none. */
export function nextOperatorStatus(current: EmergencyStatus): EmergencyStatus | null {
  switch (current) {
    case 'ASSIGNED':
      return 'EN_ROUTE';
    case 'EN_ROUTE':
      return 'ARRIVED';
    case 'ARRIVED':
      return 'PATIENT_PICKED';
    case 'PATIENT_PICKED':
      return 'HOSPITAL_REACHED';
    case 'HOSPITAL_REACHED':
      return 'COMPLETED';
    default:
      return null;
  }
}

/** Returns a human-readable label for each next-action button. */
export function nextStatusLabel(next: EmergencyStatus): string {
  switch (next) {
    case 'EN_ROUTE':
      return '▶ Start En Route';
    case 'ARRIVED':
      return '📍 Arrived on Scene';
    case 'PATIENT_PICKED':
      return '🧑‍⚕️ Patient Picked Up';
    case 'HOSPITAL_REACHED':
      return '🏥 Hospital Reached';
    case 'COMPLETED':
      return '✅ Complete Emergency';
    default:
      return next;
  }
}

/** Returns true if the emergency is still active (polling should continue). */
export function isActiveStatus(status: EmergencyStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

/** All ordered timeline steps shown in the UI. */
export const TIMELINE_STEPS: EmergencyStatus[] = [
  'REQUESTED',
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'PATIENT_PICKED',
  'HOSPITAL_REACHED',
  'COMPLETED',
];

/** Display label for each status. */
export const STATUS_LABELS: Record<EmergencyStatus, string> = {
  REQUESTED: 'Requested',
  ASSIGNED: 'Assigned',
  EN_ROUTE: 'En Route',
  ARRIVED: 'Arrived',
  PATIENT_PICKED: 'Patient Picked',
  HOSPITAL_REACHED: 'Hospital Reached',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
