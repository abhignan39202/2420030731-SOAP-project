"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  EmergencySignalEvaluator,
  magnitudeInG,
  rotationMagnitude,
  type EmergencyDetectionResult,
} from "@/lib/emergency-detection.mjs";
import type { EmergencyRequest } from "@/types/ambulance";

const CHECK_SECONDS = 20;

type DetectionState = "idle" | "requesting" | "monitoring" | "alert" | "sending" | "sent" | "error";

interface Props {
  patientId?: number;
  onEmergencyCreated: (emergency: EmergencyRequest) => void;
}

export function AutomatedEmergencyDetection({ patientId, onEmergencyCreated }: Props) {
  const [state, setState] = useState<DetectionState>("idle");
  const [countdown, setCountdown] = useState(CHECK_SECONDS);
  const [message, setMessage] = useState("");
  const [detection, setDetection] = useState<EmergencyDetectionResult | null>(null);
  const evaluator = useRef(new EmergencySignalEvaluator());
  const monitoringRef = useRef(false);
  const detectionRef = useRef<EmergencyDetectionResult | null>(null);
  const onEmergencyCreatedRef = useRef(onEmergencyCreated);
  const sendingRef = useRef(false);

  useEffect(() => { monitoringRef.current = state === "monitoring"; }, [state]);
  useEffect(() => { detectionRef.current = detection; }, [detection]);
  useEffect(() => { onEmergencyCreatedRef.current = onEmergencyCreated; }, [onEmergencyCreated]);

  const beginAlert = useCallback((result: EmergencyDetectionResult | null) => {
    if (!result || !monitoringRef.current) return;
    evaluator.current.reset();
    setDetection(result);
    setCountdown(CHECK_SECONDS);
    setMessage("");
    setState("alert");
  }, []);

  const enableMonitoring = async () => {
    setMessage("");
    if (!patientId) {
      setMessage("Sign in as a patient to enable this prototype.");
      return;
    }
    if (!("DeviceMotionEvent" in window) || !("DeviceOrientationEvent" in window)) {
      setMessage("This browser does not provide motion and orientation sensors.");
      return;
    }

    setState("requesting");
    try {
      const motionPermission = (DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<PermissionState>;
      }).requestPermission;
      const orientationPermission = (DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<PermissionState>;
      }).requestPermission;

      // iOS requires each permission request to be initiated by this user gesture.
      const permissions = await Promise.all([
        motionPermission ? motionPermission.call(DeviceMotionEvent) : Promise.resolve("granted"),
        orientationPermission ? orientationPermission.call(DeviceOrientationEvent) : Promise.resolve("granted"),
      ]);
      if (permissions.some((permission) => permission !== "granted")) {
        setState("idle");
        setMessage("Sensor permission was not granted. Monitoring has not started.");
        return;
      }
      evaluator.current.reset();
      setState("monitoring");
    } catch {
      setState("idle");
      setMessage("Sensor permission is unavailable. Monitoring has not started.");
    }
  };

  useEffect(() => {
    if (state !== "monitoring") return;

    const onMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      const result = evaluator.current.pushMotion(
        magnitudeInG(acceleration?.x ?? null, acceleration?.y ?? null, acceleration?.z ?? null),
        rotationMagnitude(event.rotationRate),
        performance.now(),
      );
      beginAlert(result);
    };
    const onOrientation = (event: DeviceOrientationEvent) => {
      beginAlert(evaluator.current.pushOrientation(event.beta, event.gamma, performance.now()));
    };

    window.addEventListener("devicemotion", onMotion);
    window.addEventListener("deviceorientation", onOrientation);
    const interval = window.setInterval(() => beginAlert(evaluator.current.check(performance.now())), 250);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      window.removeEventListener("deviceorientation", onOrientation);
      window.clearInterval(interval);
    };
  }, [beginAlert, state]);

  const submitAutomaticSos = useCallback(async (result: EmergencyDetectionResult) => {
    if (sendingRef.current || !patientId) return;
    sendingRef.current = true;
    setState("sending");
    setMessage("Getting your current GPS location and submitting an SOS request…");

    try {
      if (!navigator.geolocation) throw new Error("This browser does not support location access.");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, (error) => {
          if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
            reject(new Error("Location permission was denied. The prototype could not submit the SOS."));
          } else if (error.code === GeolocationPositionError.TIMEOUT) {
            reject(new Error("Getting your current location timed out. The prototype could not submit the SOS."));
          } else {
            reject(new Error("Your current location is unavailable. The prototype could not submit the SOS."));
          }
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });

      const emergency = await apiFetch<EmergencyRequest>("/api/emergency/request", {
        method: "POST",
        userId: patientId,
        body: JSON.stringify({
          pickupAddress: "GPS location from automated detection prototype",
          pickupLatitude: position.coords.latitude,
          pickupLongitude: position.coords.longitude,
          emergencyDescription: `Prototype automated emergency detection; no response to the ${CHECK_SECONDS}-second wellbeing check. Matched-rule score ${result.confidence}% (not a probability); signals: ${result.signals.join(", ")}.`,
          hospitalName: "",
          hospitalAddress: "",
        }),
      });

      setMessage(`SOS request saved with status ${emergency.status}. Contact local emergency services (108 / 112) for real emergencies.`);
      setState("sent");
      onEmergencyCreatedRef.current(emergency);
    } catch (error) {
      setState("error");
      setMessage(`${error instanceof Error ? error.message : "The SOS request failed."} Contact local emergency services (108 / 112) if help is needed.`);
    } finally {
      sendingRef.current = false;
    }
  }, [patientId]);

  useEffect(() => {
    if (state !== "alert" || !detection) return;
    const start = Date.now();
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, CHECK_SECONDS - Math.floor((Date.now() - start) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        window.clearInterval(interval);
        if (!sendingRef.current && detectionRef.current) void submitAutomaticSos(detectionRef.current);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [detection, state, submitAutomaticSos]);

  const cancelAlert = () => {
    if (state !== "alert") return;
    setDetection(null);
    evaluator.current.reset();
    setMessage("Cancelled. No SOS request was submitted.");
    setState("idle");
  };

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:p-6 space-y-4" aria-label="Prototype automated emergency detection">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-100 p-2 text-sky-800"><ShieldAlert className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Prototype automated emergency detection</h2>
          <p className="mt-1 text-sm text-slate-700">
            Academic prototype only. It is not medically certified and does not continuously track your location. When you enable it, this page checks browser motion and orientation signals for a combination of possible fall indicators. A single sensor spike cannot trigger an SOS.
          </p>
        </div>
      </div>

      {state === "idle" && (
        <button onClick={enableMonitoring} className="rounded-xl bg-sky-800 px-4 py-3 text-sm font-bold text-white hover:bg-sky-900">
          Enable prototype monitoring
        </button>
      )}
      {state === "requesting" && <p role="status" className="text-sm text-slate-700">Requesting sensor permission…</p>}
      {state === "monitoring" && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm font-semibold text-sky-900">Monitoring motion on this page. Location is requested only if the SOS countdown expires.</p>
          <button onClick={() => { evaluator.current.reset(); setState("idle"); setMessage("Monitoring stopped."); }} className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-bold text-slate-800">
            Stop monitoring
          </button>
        </div>
      )}
      {state === "alert" && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="wellbeing-title" className="rounded-2xl border-2 border-amber-400 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800"><AlertTriangle className="h-5 w-5" /><h3 id="wellbeing-title" className="text-xl font-extrabold">ARE YOU OK?</h3></div>
          <p className="text-sm text-slate-700">Combined sensor rules indicate a possible fall (matched-rule score {detection?.confidence}%; not a probability). An SOS will be sent with your current GPS location in:</p>
          <p aria-live="assertive" className="text-4xl font-black tabular-nums text-rose-700">{countdown} seconds</p>
          <button onClick={cancelAlert} className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-extrabold text-white hover:bg-emerald-800">
            I’m OK — cancel SOS
          </button>
        </div>
      )}
      {state === "sending" && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-slate-700"><LoaderCircle className="h-4 w-4 animate-spin" />{message}</p>}
      {state === "sent" && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-4 w-4" />{message}</p>}
      {state === "error" && <p role="alert" className="rounded-xl bg-rose-100 p-3 text-sm font-semibold text-rose-900">{message}</p>}
      {message && state === "idle" && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </section>
  );
}
