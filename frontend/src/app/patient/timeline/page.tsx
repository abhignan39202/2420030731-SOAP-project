'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  CircleSlash,
  ClipboardCheck,
  Clock3,
  FileText,
  PackageCheck,
  Pill,
  RefreshCw,
  ShoppingBag,
  Stethoscope,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface AppointmentRecord {
  id: number;
  doctorId: number;
  doctorName?: string;
  appointmentDate: string;
  startTime?: string;
  status: string;
  reason?: string;
}

interface ConsultationRecord {
  id: number;
  appointmentId: number;
  doctorId: number;
  doctorName?: string;
  symptoms?: string;
  diagnosis?: string;
  followUpInstructions?: string;
  followUpDate?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

interface PrescriptionRecord {
  id: number;
  consultationId: number;
  status: string;
  diagnosis?: string;
  issuedAt?: string;
  createdAt: string;
}

interface MedicationReminderRecord {
  id: number;
  medicineName?: string;
  dosage?: string;
  prescriptionId: number;
  scheduledAt?: string;
  scheduledTime?: string;
  status: string;
  takenAt?: string;
  acknowledgedAt?: string;
}

interface PharmacyOrderRecord {
  id: number;
  pharmacyName?: string;
  prescriptionId: number;
  status: string;
  createdAt: string;
  deliveredAt?: string;
}

type EventKind =
  | 'appointment'
  | 'consultation'
  | 'diagnosis'
  | 'prescription'
  | 'medication-scheduled'
  | 'medication-taken'
  | 'medication-skipped'
  | 'medication-missed'
  | 'pharmacy-order'
  | 'order-delivered'
  | 'follow-up';

interface TimelineEvent {
  id: string;
  kind: EventKind;
  title: string;
  detail: string;
  at: Date;
  dateOnly?: boolean;
}

interface EventStyle {
  icon: typeof Activity;
  color: string;
}

const EVENT_STYLES: Record<EventKind, EventStyle> = {
  appointment: { icon: Calendar, color: 'bg-blue-100 text-blue-700' },
  consultation: { icon: Stethoscope, color: 'bg-sky-100 text-sky-700' },
  diagnosis: { icon: ClipboardCheck, color: 'bg-violet-100 text-violet-700' },
  prescription: { icon: FileText, color: 'bg-teal-100 text-teal-700' },
  'medication-scheduled': { icon: Pill, color: 'bg-amber-100 text-amber-700' },
  'medication-taken': { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
  'medication-skipped': { icon: CircleSlash, color: 'bg-orange-100 text-orange-700' },
  'medication-missed': { icon: Clock3, color: 'bg-rose-100 text-rose-700' },
  'pharmacy-order': { icon: ShoppingBag, color: 'bg-indigo-100 text-indigo-700' },
  'order-delivered': { icon: PackageCheck, color: 'bg-emerald-100 text-emerald-700' },
  'follow-up': { icon: Calendar, color: 'bg-cyan-100 text-cyan-700' },
};

const EVENT_ORDER: Record<EventKind, number> = {
  appointment: 0,
  consultation: 1,
  diagnosis: 2,
  prescription: 3,
  'medication-scheduled': 4,
  'medication-taken': 5,
  'medication-skipped': 6,
  'medication-missed': 7,
  'pharmacy-order': 8,
  'order-delivered': 9,
  'follow-up': 10,
};

function parseLocalDate(value?: string | null, time?: string | null): Date | null {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const normalizedTime = time?.length === 5 ? `${time}:00` : time;
    const [hours = 12, minutes = 0, seconds = 0] = normalizedTime
      ? normalizedTime.split(':').map(Number)
      : [];
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildTimelineEvents(
  appointments: AppointmentRecord[],
  consultations: ConsultationRecord[],
  prescriptions: PrescriptionRecord[],
  reminders: MedicationReminderRecord[],
  orders: PharmacyOrderRecord[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const add = (
    id: string,
    kind: EventKind,
    title: string,
    detail: string,
    at: Date | null,
    dateOnly = false,
  ) => {
    if (at) events.push({ id, kind, title, detail, at, dateOnly });
  };

  appointments.forEach((appointment) => {
    add(
      `appointment-${appointment.id}`,
      'appointment',
      'Appointment',
      [
        appointment.doctorName || `Doctor #${appointment.doctorId}`,
        appointment.status,
        appointment.reason,
      ].filter(Boolean).join(' · '),
      parseLocalDate(appointment.appointmentDate, appointment.startTime),
    );
  });

  consultations.forEach((consultation) => {
    const doctor = consultation.doctorName || `Doctor #${consultation.doctorId}`;
    add(
      `consultation-${consultation.id}`,
      'consultation',
      'Consultation',
      [`Consultation #${consultation.id}`, doctor, consultation.status, consultation.symptoms]
        .filter(Boolean).join(' · '),
      parseLocalDate(consultation.startedAt) || parseLocalDate(consultation.createdAt),
    );

    if (consultation.diagnosis?.trim()) {
      add(
        `diagnosis-${consultation.id}`,
        'diagnosis',
        'Diagnosis',
        consultation.diagnosis,
        parseLocalDate(consultation.completedAt)
          || parseLocalDate(consultation.updatedAt)
          || parseLocalDate(consultation.startedAt)
          || parseLocalDate(consultation.createdAt),
      );
    }

    if (consultation.followUpDate || consultation.followUpInstructions?.trim()) {
      const hasDate = Boolean(consultation.followUpDate);
      add(
        `follow-up-${consultation.id}`,
        'follow-up',
        hasDate ? 'Follow-up scheduled' : 'Follow-up instructions',
        consultation.followUpInstructions?.trim() || `Follow-up requested after consultation #${consultation.id}`,
        parseLocalDate(consultation.followUpDate)
          || parseLocalDate(consultation.completedAt)
          || parseLocalDate(consultation.updatedAt)
          || parseLocalDate(consultation.createdAt),
        hasDate,
      );
    }
  });

  prescriptions.forEach((prescription) => {
    if (prescription.status === 'CANCELLED') return;
    add(
      `prescription-${prescription.id}`,
      'prescription',
      prescription.status === 'FINALIZED'
        ? 'Prescription issued'
        : 'Prescription draft',
      [
        `Prescription #${prescription.id}`,
        `Consultation #${prescription.consultationId}`,
        prescription.diagnosis,
      ].filter(Boolean).join(' · '),
      parseLocalDate(prescription.issuedAt) || parseLocalDate(prescription.createdAt),
    );
  });

  reminders.forEach((reminder) => {
    const medicine = [reminder.medicineName, reminder.dosage].filter(Boolean).join(' · ')
      || `Medication #${reminder.id}`;
    const scheduledAt = parseLocalDate(reminder.scheduledAt || reminder.scheduledTime);
    add(
      `medication-scheduled-${reminder.id}`,
      'medication-scheduled',
      'Medication scheduled',
      `${medicine} · Prescription #${reminder.prescriptionId}`,
      scheduledAt,
    );

    if (reminder.status === 'TAKEN') {
      add(`medication-taken-${reminder.id}`, 'medication-taken', 'Medication taken', medicine, parseLocalDate(reminder.takenAt));
    } else if (reminder.status === 'SKIPPED') {
      add(
        `medication-skipped-${reminder.id}`,
        'medication-skipped',
        'Medication skipped',
        medicine,
        parseLocalDate(reminder.acknowledgedAt) || scheduledAt,
      );
    } else if (reminder.status === 'MISSED') {
      add(`medication-missed-${reminder.id}`, 'medication-missed', 'Dose missed', medicine, scheduledAt);
    }
  });

  orders.forEach((order) => {
    add(
      `pharmacy-order-${order.id}`,
      'pharmacy-order',
      'Pharmacy order',
      [`Order #${order.id}`, order.pharmacyName, `Prescription #${order.prescriptionId}`, order.status]
        .filter(Boolean).join(' · '),
      parseLocalDate(order.createdAt),
    );

    if (order.status === 'DELIVERED') {
      add(
        `order-delivered-${order.id}`,
        'order-delivered',
        'Order delivered',
        `Order #${order.id}${order.pharmacyName ? ` · ${order.pharmacyName}` : ''}`,
        parseLocalDate(order.deliveredAt),
      );
    }
  });

  return events.sort((left, right) =>
    left.at.getTime() - right.at.getTime()
    || EVENT_ORDER[left.kind] - EVENT_ORDER[right.kind]
    || left.id.localeCompare(right.id),
  );
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PatientTimelinePage() {
  const { user } = useAuth();
  const patientId = user?.id;
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTimeline = useCallback(async () => {
    if (!patientId) {
      throw new Error('Sign in to view your health timeline.');
    }

    const fetchAllReminderPages = async () => {
      const allReminders: MedicationReminderRecord[] = [];
      const pageSize = 100;
      let page = 0;
      while (true) {
        const pageRecords = await apiFetch<MedicationReminderRecord[]>(
          `/api/medicines/history?page=${page}&size=${pageSize}`,
          { userId: patientId },
        );
        const records = Array.isArray(pageRecords) ? pageRecords : [];
        allReminders.push(...records);
        if (records.length < pageSize) break;
        page += 1;
      }
      return allReminders;
    };

    const [appointments, consultations, prescriptions, reminders, orders] = await Promise.all([
      apiFetch<AppointmentRecord[]>(`/api/appointments/patient/${patientId}`, { userId: patientId }),
      apiFetch<ConsultationRecord[]>(`/api/consultations/patient/${patientId}`, { userId: patientId }),
      apiFetch<PrescriptionRecord[]>(`/api/prescriptions/patient/${patientId}`, { userId: patientId }),
      fetchAllReminderPages(),
      apiFetch<PharmacyOrderRecord[]>('/api/pharmacy/orders/patient', { userId: patientId }),
    ]);

    return buildTimelineEvents(
        Array.isArray(appointments) ? appointments : [],
        Array.isArray(consultations) ? consultations : [],
        Array.isArray(prescriptions) ? prescriptions : [],
        reminders,
        Array.isArray(orders) ? orders : [],
    );
  }, [patientId]);

  useEffect(() => {
    let active = true;
    loadTimeline()
      .then((timelineEvents) => {
        if (active) {
          setEvents(timelineEvents);
          setLoadError('');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setEvents([]);
          setLoadError(error instanceof Error ? error.message : 'Unable to load your health timeline.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadTimeline, refreshKey]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, { date: Date; events: TimelineEvent[] }>();
    events.forEach((event) => {
      const key = dateKey(event.at);
      const group = groups.get(key) || { date: event.at, events: [] };
      group.events.push(event);
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-semibold">Your care history</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Health Timeline</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            A chronological view of appointments, care, medication, and pharmacy orders recorded for you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setLoadError('');
            setRefreshKey((key) => key + 1);
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError('');
              setRefreshKey((key) => key + 1);
            }}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
          Loading your health timeline…
        </div>
      ) : loadError ? null : events.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <Activity className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">No health events yet</h2>
          <p className="mt-1 text-sm text-slate-600">Your recorded care and medication events will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedEvents.map((group) => (
            <section key={dateKey(group.date)} aria-label={formatDate(group.date)}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{formatDate(group.date)}</h2>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 sm:px-6">
                {group.events.map((event, index) => {
                  const style = EVENT_STYLES[event.kind];
                  const Icon = style.icon;
                  return (
                    <article
                      key={event.id}
                      data-testid="timeline-event"
                      data-event-type={event.kind}
                      className="relative flex gap-4 py-5"
                    >
                      {index < group.events.length - 1 && (
                        <span aria-hidden="true" className="absolute left-5 top-12 bottom-0 w-px bg-slate-200" />
                      )}
                      <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.color}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h3 className="font-semibold text-slate-900">{event.title}</h3>
                          {!event.dateOnly && (
                            <time dateTime={event.at.toISOString()} className="text-xs font-medium text-slate-500">
                              {event.at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </time>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{event.detail}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
