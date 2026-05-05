"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { formatDateTime } from "@/lib/time";
import type { QueueStatus } from "@/lib/types";

type QueueEntry = {
  id: string;
  service_name: string;
  barber_name: string | null;
  assigned_appointment_id: string | null;
  status: QueueStatus;
  position: number | null;
  estimated_time: string | null;
  peopleAhead: number;
};

const STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: "Esperando asignacion",
  called: "Llamado al box",
  in_progress: "En atencion",
  done: "Atendido",
  no_show: "Ausente",
  cancelled: "Cancelado"
};

const POSITION_LABELS: Partial<Record<QueueStatus, string>> = {
  called: "Es tu turno",
  in_progress: "En atencion",
  done: "Atendido",
  no_show: "Ausente",
  cancelled: "Cancelado"
};

export function QueueStatusPanel(input: {
  tenantSlug: string;
  queueEntryId: string;
  timezone: string;
  initialEntry: QueueEntry;
  initialError?: string;
  cancelled?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const usesLegacyTenantPath = pathname === `/${input.tenantSlug}` || pathname?.startsWith(`/${input.tenantSlug}/`);
  const tenantHref = (path = "/") => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return usesLegacyTenantPath
      ? `/${input.tenantSlug}${normalizedPath === "/" ? "" : normalizedPath}`
      : normalizedPath;
  };
  const [queueEntry, setQueueEntry] = useState(input.initialEntry);
  const [error, setError] = useState(input.initialError ?? "");
  const [highlightMessage, setHighlightMessage] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const previousEntryRef = useRef(input.initialEntry);
  const hasMountedRef = useRef(false);
  const hasPlayedInitialUrgentAlertRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function needsLiveTracking(entry: QueueEntry) {
    return entry.status === "waiting" || entry.status === "called";
  }

  function shouldShowKeepOpenMessage(entry: QueueEntry) {
    return entry.status === "waiting";
  }

  function openAlertModal(persistent: boolean) {
    setIsAlertOpen(true);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (!persistent) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsAlertOpen(false);
        closeTimeoutRef.current = null;
      }, 5000);
    }
  }

  function shouldHighlight(entry: QueueEntry) {
    return entry.status === "called"
      || entry.status === "in_progress"
      || entry.peopleAhead === 0
      || ((entry.position ?? 99) <= 1 && entry.status === "waiting");
  }

  async function playAlertEffects() {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.35);

        window.setTimeout(() => {
          void audioContext.close().catch(() => undefined);
        }, 500);
      }
    } catch {
      // Ignore audio issues; visual alert remains the primary fallback.
    }

    if ("vibrate" in navigator) {
      navigator.vibrate([220, 120, 220]);
    }
  }

  async function handleCancelQueueEntry() {
    if (isCancelling) {
      return;
    }

    setIsCancelling(true);
    setError("");

    try {
      const response = await fetch(`/api/public/${input.tenantSlug}/queue/${input.queueEntryId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fromStatusPage: true })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "No se pudo salir de la fila.");
      }

      setIsAlertOpen(false);
      setHighlightMessage("");
      router.replace(`${tenantHref("/fila")}?cancelled=1`);
      router.refresh();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "No se pudo salir de la fila.");
      setIsCancelling(false);
    }
  }

  function resolveHighlightMessage(previousEntry: QueueEntry, nextEntry: QueueEntry) {
    if (nextEntry.status === "called") {
      return "Es tu turno. Acercate al local.";
    }

    if (nextEntry.status === "in_progress") {
      return "Ya te están atendiendo.";
    }

    if (nextEntry.peopleAhead === 0 && previousEntry.peopleAhead > 0) {
      return "Ya no tenés personas adelante. Quedate atento a esta pantalla.";
    }

    if ((nextEntry.position ?? 99) < (previousEntry.position ?? 99)) {
      return "La fila avanzó. Tu turno está cada vez más cerca.";
    }

    if (nextEntry.estimated_time !== previousEntry.estimated_time) {
      return "Actualizamos el tiempo estimado de atención.";
    }

    return "";
  }

  useEffect(() => {
    const initialIsUrgent = shouldHighlight(input.initialEntry);
    setIsUrgent(initialIsUrgent);

    if (input.initialEntry.status === "called") {
      setHighlightMessage("Es tu turno. Acercate al local.");
      setIsAlertOpen(true);
      return;
    }

    if (input.initialEntry.status === "in_progress") {
      setHighlightMessage("Ya te están atendiendo.");
      setIsAlertOpen(true);
      return;
    }

    if (initialIsUrgent && input.initialEntry.status === "waiting") {
      setHighlightMessage("Tu turno está cerca. Quedate atento a esta pantalla.");
      setIsAlertOpen(true);
      return;
    }

    setHighlightMessage("");
    setIsAlertOpen(false);
  }, [input.initialEntry]);

  useEffect(() => {
    if (!shouldHighlight(queueEntry)) {
      return;
    }

    if (hasPlayedInitialUrgentAlertRef.current) {
      return;
    }

    hasPlayedInitialUrgentAlertRef.current = true;
    openAlertModal(queueEntry.status === "called" || queueEntry.status === "in_progress");
    void playAlertEffects();
  }, [queueEntry]);

  useEffect(() => {
    let cancelled = false;

    const refreshQueueEntry = async () => {
      try {
        const response = await fetch(`/api/public/${input.tenantSlug}/queue/${input.queueEntryId}`, {
          cache: "no-store"
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo actualizar la fila.");
        }

        if (cancelled) {
          return;
        }

        const nextEntry = body.queueEntry as QueueEntry;
        const previousEntry = previousEntryRef.current;
        const nextIsUrgent = shouldHighlight(nextEntry);

        if (hasMountedRef.current) {
          const changed =
            nextEntry.position !== previousEntry.position
            || nextEntry.status !== previousEntry.status
            || nextEntry.estimated_time !== previousEntry.estimated_time
            || nextEntry.peopleAhead !== previousEntry.peopleAhead;

          if (changed) {
            const nextMessage = resolveHighlightMessage(previousEntry, nextEntry);
            setHighlightMessage(nextMessage);
            if (nextMessage) {
              openAlertModal(nextEntry.status === "called" || nextEntry.status === "in_progress");
            }
          }

          if (
            nextEntry.status !== previousEntry.status
            || (nextIsUrgent && !shouldHighlight(previousEntry))
            || (nextEntry.peopleAhead === 0 && previousEntry.peopleAhead > 0)
          ) {
            void playAlertEffects();
          }
        } else {
          hasMountedRef.current = true;
        }

        previousEntryRef.current = nextEntry;
        setQueueEntry(nextEntry);
        setIsUrgent(nextIsUrgent);
        setError("");
      } catch (refreshError) {
        if (!cancelled) {
          setError(refreshError instanceof Error ? refreshError.message : "No se pudo actualizar la fila.");
        }
      }
    };

    void refreshQueueEntry();

    if (!needsLiveTracking(input.initialEntry)) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(async () => {
      if (!needsLiveTracking(previousEntryRef.current)) {
        window.clearInterval(intervalId);
        return;
      }

      void refreshQueueEntry();
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [input.initialEntry, input.queueEntryId, input.tenantSlug]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="stack" style={{ gap: 20, position: "relative" }}>
      {highlightMessage && isAlertOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="assertive"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(3,3,3,0.7)",
            backdropFilter: "blur(8px)"
          }}
        >
          <div
            style={{
              width: "min(100%, 480px)",
              padding: "22px 22px 20px",
              borderRadius: "24px",
              background: isUrgent
                ? "linear-gradient(135deg, rgba(245, 200, 66, 0.98), rgba(194, 153, 49, 0.94))"
                : "linear-gradient(165deg, rgba(28, 28, 28, 0.96), rgba(15, 15, 15, 0.98))",
              color: isUrgent ? "var(--accent-ink)" : "white",
              border: isUrgent
                ? "1px solid rgba(255, 226, 140, 0.45)"
                : "1px solid rgba(255,255,255,0.12)",
              boxShadow: isUrgent
                ? "0 24px 60px rgba(245, 200, 66, 0.28)"
                : "0 20px 60px rgba(0,0,0,0.36)",
              animation: "fadeIn 180ms ease-out"
            }}
          >
            <div className="stack" style={{ gap: 18 }}>
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isUrgent ? "rgba(5,5,5,0.14)" : "rgba(245, 200, 66, 0.14)",
                      flexShrink: 0
                    }}
                  >
                    {isUrgent ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <strong style={{ fontSize: "0.88rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {isUrgent ? "Atención ahora" : "Actualización"}
                    </strong>
                    <h2 style={{ fontSize: "1.35rem", lineHeight: 1.05, margin: 0 }}>
                      {highlightMessage}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAlertOpen(false)}
                  aria-label="Cerrar aviso"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "none",
                    background: isUrgent ? "rgba(5,5,5,0.12)" : "rgba(255,255,255,0.08)",
                    color: "inherit",
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              </div>

              <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5, opacity: 0.92 }}>
                {queueEntry.status === "called"
                  ? "Tu lugar ya está listo. Podés acercarte al local."
                  : queueEntry.status === "in_progress"
                    ? "La atención ya está en curso. Ya no necesitás seguir actualizando esta pantalla."
                    : "La fila cambió y actualizamos tu seguimiento en tiempo real."}
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                {queueEntry.assigned_appointment_id ? (
                  <Link className="btn" href={tenantHref(`/mi-turno/${queueEntry.assigned_appointment_id}`)} style={{ minHeight: "48px" }}>
                    Ver turno
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setIsAlertOpen(false)}
                  style={{ minHeight: "48px" }}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {input.cancelled ? (
        <div className="notice" style={{ fontSize: "0.85rem" }}>
          Tu lugar en la fila fue cancelado.
        </div>
      ) : null}
      {error ? <div className="notice error">{error}</div> : null}
      {shouldShowKeepOpenMessage(queueEntry) ? (
        <div
          className="notice"
          style={{
            fontSize: "0.85rem",
            background: isUrgent ? "rgba(245, 200, 66, 0.08)" : "rgba(255,255,255,0.03)",
            borderColor: isUrgent ? "rgba(245, 200, 66, 0.22)" : "rgba(255,255,255,0.06)"
          }}
        >
          Dejá esta pantalla abierta. El seguimiento y los avisos ocurren acá mientras la tengas abierta.
        </div>
      ) : null}

      <div className="summary-card">
        <div className="header-row">
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">Estado de fila</span>
            <h1 style={{ fontSize: "2rem" }}>Tu lugar de hoy</h1>
          </div>
          <span className="status-pill">{STATUS_LABELS[queueEntry.status]}</span>
        </div>

        <div className="grid cols-2">
          <div className="metric-card">
            <small className="muted">Posicion</small>
            <strong style={{ fontSize: queueEntry.position ? "2rem" : "1.1rem" }}>
              {queueEntry.position ?? POSITION_LABELS[queueEntry.status] ?? "-"}
            </strong>
          </div>
          <div className="metric-card">
            <small className="muted">Personas delante</small>
            <strong style={{ fontSize: "2rem" }}>{queueEntry.peopleAhead}</strong>
          </div>
          <div className="metric-card">
            <small className="muted">ETA</small>
            <strong>{queueEntry.estimated_time ? formatDateTime(queueEntry.estimated_time, input.timezone) : "Sin ETA"}</strong>
          </div>
          <div className="metric-card">
            <small className="muted">Profesional</small>
            <strong>{queueEntry.barber_name ?? "Primer disponible"}</strong>
          </div>
        </div>

        <div className="notice" style={{ fontSize: "0.9rem" }}>
          <strong style={{ display: "block", marginBottom: 6 }}>{queueEntry.service_name}</strong>
          {queueEntry.assigned_appointment_id
            ? "Ya tenés un lugar asignado. Seguí esta pantalla para ver el estado de tu atención."
            : "Seguís tu lugar en tiempo real desde esta página. Si la fila avanza, lo vas a ver acá."}
        </div>
      </div>

      <div className="grid cols-2">
        <button
          className="btn-ghost"
          type="button"
          disabled={isCancelling || (queueEntry.status !== "waiting" && queueEntry.status !== "called")}
          onClick={() => void handleCancelQueueEntry()}
          style={{ width: "100%" }}
        >
          {isCancelling ? "Saliendo..." : "Salir de la fila"}
        </button>
        <Link className="btn-secondary" href={tenantHref("/reservar")} style={{ width: "100%" }}>
          Reservar turno
        </Link>
      </div>

      {queueEntry.assigned_appointment_id ? (
        <Link className="btn" href={tenantHref(`/mi-turno/${queueEntry.assigned_appointment_id}`)} style={{ width: "100%" }}>
          Ver turno asignado
        </Link>
      ) : null}
    </div>
  );
}
