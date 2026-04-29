"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ServiceItem = {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  description?: string | null;
};

type BarberItem = {
  id: string;
  full_name: string;
};

type QueueEligibility = {
  eligible: boolean;
  code: "ok" | "no_barbers" | "outside_working_hours" | "near_closing" | "no_slots";
  message: string;
};

export function QueueEntryForm(input: {
  tenantSlug: string;
  services: ServiceItem[];
  barbersByService: Record<string, BarberItem[]>;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [serviceId, setServiceId] = useState(input.services[0]?.id ?? "");
  const [barberId, setBarberId] = useState("");
  const [eligibility, setEligibility] = useState<QueueEligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState("");
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const latestRequestRef = useRef(0);

  const barbers = useMemo(
    () => (serviceId ? input.barbersByService[serviceId] ?? [] : []),
    [input.barbersByService, serviceId]
  );
  const selectedService = useMemo(
    () => input.services.find((service) => service.id === serviceId) ?? null,
    [input.services, serviceId]
  );
  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === barberId) ?? null,
    [barberId, barbers]
  );

  useEffect(() => {
    if (!barberId) {
      return;
    }

    const stillAvailable = barbers.some((barber) => barber.id === barberId);
    if (!stillAvailable) {
      setBarberId("");
    }
  }, [barberId, barbers]);

  async function fetchEligibility(currentServiceId: string, currentBarberId: string) {
    if (!currentServiceId) {
      return null;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setIsCheckingEligibility(true);
    setEligibilityError("");

    try {
      const searchParams = new URLSearchParams({
        serviceId: currentServiceId
      });
      if (currentBarberId) {
        searchParams.set("barberId", currentBarberId);
      }

      const response = await fetch(`/api/public/${input.tenantSlug}/queue/eligibility?${searchParams.toString()}`, {
        cache: "no-store"
      });
      const body = await response.json().catch(() => ({}));

      if (latestRequestRef.current !== requestId) {
        return null;
      }

      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "No se pudo validar la fila virtual.");
      }

      const nextEligibility = body as QueueEligibility;
      setEligibility(nextEligibility);
      if (!nextEligibility.eligible) {
        setIsEligibilityModalOpen(true);
      }

      return nextEligibility;
    } catch (error) {
      if (latestRequestRef.current !== requestId) {
        return null;
      }

      const message = error instanceof Error ? error.message : "No se pudo validar la fila virtual.";
      setEligibility(null);
      setEligibilityError(message);
      return null;
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsCheckingEligibility(false);
      }
    }
  }

  useEffect(() => {
    void fetchEligibility(serviceId, barberId);
  }, [serviceId, barberId]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isEligibilityModalOpen) {
      document.body.style.overflow = "";
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isEligibilityModalOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEligibility = await fetchEligibility(serviceId, barberId);
    if (!nextEligibility?.eligible) {
      setIsEligibilityModalOpen(true);
      return;
    }

    formRef.current?.submit();
  }

  return (
    <>
      {hasMounted && !eligibility?.eligible && isEligibilityModalOpen && eligibility?.message
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-live="assertive"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "rgba(3,3,3,0.72)",
                backdropFilter: "blur(8px)"
              }}
            >
              <div
                style={{
                  width: "min(100%, 480px)",
                  padding: "22px 22px 20px",
                  borderRadius: "24px",
                  background: "linear-gradient(165deg, rgba(28, 28, 28, 0.98), rgba(15, 15, 15, 0.99))",
                  color: "white",
                  border: "1px solid rgba(245, 200, 66, 0.22)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.4)"
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
                          background: "rgba(245, 200, 66, 0.14)",
                          color: "var(--accent)",
                          flexShrink: 0
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 8v4" />
                          <path d="M12 16h.01" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      </div>
                      <div className="stack" style={{ gap: 4 }}>
                        <strong style={{ fontSize: "0.88rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)" }}>
                          Fila virtual
                        </strong>
                        <h2 style={{ fontSize: "1.35rem", lineHeight: 1.05, margin: 0 }}>
                          Ingreso no disponible
                        </h2>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEligibilityModalOpen(false)}
                      aria-label="Cerrar aviso"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(255,255,255,0.08)",
                        color: "inherit",
                        cursor: "pointer",
                        flexShrink: 0
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: "0.98rem", lineHeight: 1.5, color: "rgba(255,255,255,0.9)" }}>
                    {eligibility.message}
                  </p>

                  <div className="notice" style={{ fontSize: "0.84rem", margin: 0 }}>
                    Revisá otro servicio o profesional, o volvé más temprano si querés sumarte a la fila.
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setIsEligibilityModalOpen(false)}
                      style={{ minHeight: "48px" }}
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <form
        ref={formRef}
        method="post"
        action={`/api/public/${input.tenantSlug}/queue`}
        className="stack"
        onSubmit={(event) => void handleSubmit(event)}
      >
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="barberId" value={barberId} />

      <section className="stack" style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Seleccioná el Servicio</h2>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Elegí qué querés hacer hoy y la fila se ordena según capacidad real.
          </p>
        </div>

        <div className="list service-grid-mobile selection-grid">
          {input.services.map((service) => {
            const active = service.id === serviceId;

            return (
              <button
                key={service.id}
                type="button"
                className={`service-card ${active ? "active" : ""}`}
                onClick={() => setServiceId(service.id)}
                style={{ textAlign: "left", cursor: "pointer", width: "100%" }}
              >
                <div className="service-top">
                  <div className="stack" style={{ gap: 4 }}>
                    <strong style={{ fontSize: "1rem" }}>{service.name}</strong>
                    <small className="muted">{service.description ?? "Atencion inmediata segun disponibilidad"}</small>
                  </div>
                  <span className="price-tag">${Number(service.price).toLocaleString("es-AR")}</span>
                </div>
                <div className="chip-row">
                  <span className="chip" style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.05)" }}>
                    {service.duration_minutes}m
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="stack" style={{ gap: 20, padding: "4px 0", borderTop: "1px solid var(--line)" }}>
        <div className="stack" style={{ gap: 6 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Elegí el Profesional</h2>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Podés dejar que el sistema tome al primero libre o priorizar a alguien del equipo.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "nowrap",
            overflowX: "auto",
            gap: "20px",
            padding: "10px 12px 10px",
            margin: "0 -12px",
            width: "calc(100% + 24px)",
            justifyContent: "center"
          }}
          className="hide-scrollbar"
        >
          <button
            type="button"
            onClick={() => setBarberId("")}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.3s ease",
              transform: !barberId ? "scale(1.05)" : "scale(1)"
            }}
          >
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: !barberId ? "rgba(245, 200, 66, 0.15)" : "rgba(255,255,255,0.03)",
              border: "2px solid",
              borderColor: !barberId ? "var(--accent)" : "rgba(255,255,255,0.1)",
              boxShadow: !barberId ? "0 0 20px rgba(245, 200, 66, 0.2)" : "none",
              transition: "all 0.3s ease",
              color: !barberId ? "var(--accent)" : "var(--muted)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: !barberId ? "var(--accent)" : "var(--muted)",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              letterSpacing: "0.02em"
            }}>
              Cualquiera
            </span>
          </button>

          {barbers.map((barber) => {
            const active = barber.id === barberId;
            const initials = barber.full_name.split(" ").map((name) => name[0]).join("").slice(0, 2);

            return (
              <button
                key={barber.id}
                type="button"
                onClick={() => setBarberId(barber.id)}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.3s ease",
                  transform: active ? "scale(1.05)" : "scale(1)"
                }}
              >
                <div style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  background: active ? "rgba(245, 200, 66, 0.15)" : "rgba(255,255,255,0.03)",
                  border: "2px solid",
                  borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.1)",
                  boxShadow: active ? "0 0 20px rgba(245, 200, 66, 0.2)" : "none",
                  transition: "all 0.3s ease",
                  color: active ? "var(--accent)" : "var(--text)"
                }}>
                  {initials}
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: active ? "var(--accent)" : "var(--muted)",
                  whiteSpace: "nowrap"
                }}>
                  {barber.full_name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="stack" style={{ gap: 20, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
        <div className="stack" style={{ gap: 6 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "white" }}>Finalizar Ingreso</h2>
          <p className="muted" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
            Confirmá tus datos para entrar a la cola activa.
          </p>
        </div>

        <div className="stack" style={{ gap: 24, maxWidth: "700px", margin: "0 auto", width: "100%" }}>
          <div
            className="summary-card"
            style={{
              background: "#161616",
              border: "1px solid rgba(245, 200, 66, 0.3)",
              padding: "18px 20px",
              borderRadius: "20px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}
          >
            <span
              className="eyebrow"
              style={{ color: "var(--accent)", fontSize: "0.66rem", display: "block", marginBottom: "12px", letterSpacing: "0.08em", fontWeight: 900 }}
            >
              RESUMEN
            </span>

            <div className="stack" style={{ gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "5px" }}>
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>Servicio</span>
                <strong style={{ fontSize: "0.85rem", color: "white" }}>{selectedService?.name || "-"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "5px" }}>
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>Profesional</span>
                <strong style={{ fontSize: "0.85rem", color: "white" }}>{selectedBarber?.full_name || "Primer disponible"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>Modalidad</span>
                <strong style={{ fontSize: "0.85rem", color: "var(--accent)" }}>Fila inmediata</strong>
              </div>
            </div>

            <div style={{ height: "1px", background: "rgba(245, 200, 66, 0.2)", margin: "14px 0 12px" }} />

            <div className="summary-row" style={{ justifyContent: "space-between", display: "flex", alignItems: "center", flexDirection: "row" }}>
              <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>REFERENCIA</span>
              <span className="price-tag" style={{ fontSize: "1.5rem", color: "var(--accent)", fontWeight: 900 }}>
                ${selectedService ? Number(selectedService.price).toLocaleString("es-AR") : "-"}
              </span>
            </div>
          </div>

          <div className="stack" style={{ gap: 24 }}>
            <div className="stack" style={{ gap: 14 }}>
              <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.72rem", fontWeight: 800 }}>Tus datos</span>
              <div className="stack" style={{ gap: "24px", padding: "18px", borderRadius: "18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="grid cols-2" style={{ gap: "16px" }}>
                  <label>
                    Nombre completo
                    <input name="fullName" placeholder="Tu nombre y apellido" required />
                  </label>
                  <label>
                    WhatsApp / Telefono
                    <input name="phone" placeholder="Ej: 11 1234 5678" required />
                  </label>
                </div>

                <label>
                  Email (opcional)
                  <input type="email" name="email" placeholder="tu@email.com" />
                </label>
              </div>
            </div>

            <div className="stack" style={{ gap: 14 }}>
              {eligibilityError ? <div className="notice error">{eligibilityError}</div> : null}
              {!eligibility?.eligible && eligibility?.message ? (
                <div className="notice" style={{ fontSize: "0.85rem" }}>
                  {eligibility.message}
                </div>
              ) : null}
              <button
                className="btn"
                type="submit"
                disabled={isCheckingEligibility}
                style={{ width: "100%", height: "56px", fontSize: "1.05rem", fontWeight: 800, opacity: isCheckingEligibility ? 0.7 : 1 }}
              >
                {isCheckingEligibility ? "Validando disponibilidad..." : "Entrar en la fila virtual"}
              </button>

              <p className="muted" style={{ fontSize: "0.75rem", textAlign: "center" }}>
                La posicion y el tiempo estimado se recalculan en tiempo real segun agenda y cola activa.
              </p>
            </div>
          </div>
        </div>
      </section>
      </form>
    </>
  );
}
