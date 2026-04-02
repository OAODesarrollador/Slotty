"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatCurrency, formatDateTime, formatHour } from "@/lib/time";

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
};

type BarberItem = {
  id: string;
  full_name: string;
  rating: string;
};

type AvailabilitySlot = {
  barberId: string;
  barberName: string;
  start: string;
  end: string;
};

interface QuickBookingFlowProps {
  slug: string;
  tenantName: string;
  timezone: string;
  services: ServiceItem[];
  barbersByService: Record<string, BarberItem[]>;
  initialServiceId?: string;
  initialDate: string;
  minDate: string;
  initialBarberId?: string;
  initialSlotStart?: string;
  initialError?: string;
}

export function QuickBookingFlow({
  slug,
  tenantName,
  timezone,
  services,
  barbersByService,
  initialServiceId,
  initialDate,
  minDate,
  initialBarberId,
  initialSlotStart,
  initialError
}: QuickBookingFlowProps) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id ?? "");
  const [date, setDate] = useState(initialDate);
  const [barberId, setBarberId] = useState(initialBarberId ?? "");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState(initialSlotStart ? `${initialBarberId || ""}-${initialSlotStart}` : "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services]
  );
  const barbers = serviceId ? barbersByService[serviceId] ?? [] : [];
  const selectedSlot = useMemo(
    () => slots.find((slot) => `${slot.barberId}-${slot.start}` === selectedSlotId) ?? null,
    [selectedSlotId, slots]
  );

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    setAvailabilityLoading(true);

    const params = new URLSearchParams({ serviceId, date });
    if (barberId) {
      params.set("barberId", barberId);
    }

    fetch(`/api/public/${slug}/availability?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store"
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo cargar la disponibilidad.");
        }
        return body as { slots: AvailabilitySlot[] };
      })
      .then((body) => {
        setSlots(body.slots ?? []);
        setError("");
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setSlots([]);
        setSelectedSlotId("");
        setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la disponibilidad.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAvailabilityLoading(false);
        }
      });

    return () => controller.abort();
  }, [barberId, date, serviceId, slug]);

  const handleServiceChange = (nextServiceId: string) => {
    setServiceId(nextServiceId);
    setBarberId("");
    setSelectedSlotId("");
    setError("");
    
    // Auto Scroll to next step (Calendar/Professional)
    setTimeout(() => {
      step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlotId(`${slot.barberId}-${slot.start}`);
    
    // Auto Scroll to confirmation step (Personal Data)
    setTimeout(() => {
      step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const validate = () => {
    const nextErrors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      nextErrors.name = "Ingresá tu nombre.";
    }

    if (!phone.trim()) {
      nextErrors.phone = "Ingresá tu teléfono.";
    } else if (phone.trim().length < 6) {
      nextErrors.phone = "El teléfono es demasiado corto.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot) {
      setError("Seleccioná un horario antes de confirmar.");
      return;
    }

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/public/${slug}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId: selectedSlot.barberId,
          scheduledAt: selectedSlot.start,
          customer: {
            name: name.trim(),
            phone: phone.trim()
          },
          notes: notes.trim()
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo confirmar la reserva.");
      }

      router.push(`/${slug}/mi-turno/${body.appointmentId}`);
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo confirmar la reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page" style={{ paddingBottom: "100px" }}>
      <section className="shell stack" style={{ gap: "35px", paddingTop: "0" }}>
        
        <div className="header-row">
          <div className="stack" style={{ gap: 10 }}>
            <span className="eyebrow">Reserva Premium</span>
            <h1 style={{ fontSize: "2.2rem" }}>Tu próxima experiencia</h1>
            <p className="page-lead" style={{ fontSize: "0.95rem" }}>
              Seleccioná el servicio y profesional que mejor se adapte a tu estilo. 
            </p>
          </div>
        </div>

        {/* STEP 1: SERVICES SELECTION */}
        <section className="stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Seleccioná el Servicio</h2>
          </div>
          
          <div className="list service-grid-mobile">
            {services.map((service) => {
              const active = service.id === serviceId;
              return (
                <button
                  key={service.id}
                  type="button"
                  className={`service-card ${active ? "active" : ""}`}
                  onClick={() => handleServiceChange(service.id)}
                >
                  <div className="service-top">
                    <div className="stack" style={{ gap: 4 }}>
                      <strong style={{ fontSize: "1rem" }}>{service.name}</strong>
                      <small className="muted desktop-show">{service.description ?? "Técnicas tradicionales"}</small>
                    </div>
                    <span className="price-tag">{formatCurrency(service.price)}</span>
                  </div>
                  <div className="chip-row">
                    <span className="chip" style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.05)" }}>{service.duration_minutes}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 2: PROFESSIONAL & SLOT SELECTION */}
        <div ref={step2Ref} className="stack" style={{ gap: 24, padding: "24px 0", borderTop: "1px solid var(--line)", scrollMarginTop: "140px" }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Día y Profesional</h2>
            <p className="muted" style={{ fontSize: "0.85rem" }}>Encontrá el espacio perfecto.</p>
          </div>

          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 10 }}>
              <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Seleccioná el Día</span>
              <div 
                style={{ 
                  display: "flex", 
                  gap: "14px", 
                  overflowX: "auto", 
                  padding: "10px 12px 20px",
                  margin: "0 -12px",
                  width: "calc(100% + 24px)",
                  msOverflowStyle: "none",
                  scrollbarWidth: "none"
                }}
                className="hide-scrollbar"
              >
                {Array.from({ length: 14 }).map((_, i) => {
                  const d = new Date(minDate + "T12:00:00");
                  d.setDate(d.getDate() + i);
                  const iso = d.toISOString().split("T")[0];
                  const active = iso === date;
                  
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setDate(iso)}
                      style={{
                        flexShrink: 0,
                        width: "74px",
                        height: "90px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        borderRadius: "20px",
                        background: active ? "rgba(245, 200, 66, 0.12)" : "rgba(255,255,255,0.02)",
                        border: "1px solid",
                        borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
                        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        transform: active ? "scale(1.12)" : "scale(1)",
                        zIndex: active ? 1 : 0,
                        cursor: "pointer"
                      }}
                    >
                      <span style={{ fontSize: "0.65rem", opacity: active ? 1 : 0.6, fontWeight: 800, textTransform: "uppercase" }}>
                        {d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "").slice(0, 3)}
                      </span>
                      <strong style={{ fontSize: "1.3rem", color: active ? "var(--accent)" : "var(--text)" }}>
                        {d.getDate()}
                      </strong>
                      <span style={{ fontSize: "0.6rem", opacity: active ? 0.9 : 0.5, fontWeight: 700 }}>
                        {d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").slice(0, 3)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="stack" style={{ gap: 12 }}>
              <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Barbero</span>
              <div 
                style={{ 
                  display: "flex", 
                  flexWrap: "nowrap", 
                  overflowX: "auto", 
                  gap: "20px", 
                  padding: "10px 12px 20px",
                  margin: "0 -12px",
                  width: "calc(100% + 24px)",
                  justifyContent: "center" 
                }}
                className="hide-scrollbar"
              >
                {/* ANYONE OPTION */}
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
                  }}>Cualquiera</span>
                </button>

                {/* BARBER LIST */}
                {barbers.length > 0 ? (
                  barbers.map((barber) => {
                    const active = barber.id === barberId;
                    const initials = barber.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);
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
                        }}>{barber.full_name.split(" ")[0]}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="stack" style={{ gap: 4, opacity: 0.5, padding: "20px 0" }}>
                    <small>No hay otros profesionales disponibles</small>
                    <small style={{ fontSize: "0.7rem" }}>para este servicio en esta fecha.</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: PROFESSIONAL & SLOT SELECTION (SLOTS) */}
        <div className="stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Horarios Disponibles</span>
          </div>

          <div 
            className="grid" 
            style={{ 
              gridTemplateColumns: "repeat(3, 1fr)", 
              gap: "8px", 
              width: "100%" 
            }}
          >
            {availabilityLoading ? (
              <div className="muted" style={{ gridColumn: "span 3", textAlign: "center", padding: "40px" }}>Buscando espacios...</div>
            ) : slots.length > 0 ? (
              slots.map((slot) => {
                const active = `${slot.barberId}-${slot.start}` === selectedSlotId;
                return (
                  <button
                    key={`${slot.barberId}-${slot.start}`}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    style={{
                      height: "48px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "12px",
                      background: active ? "var(--accent)" : "rgba(255,255,255,0.03)",
                      border: "1px solid",
                      borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
                      color: active ? "var(--bg)" : "var(--text)",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <strong style={{ fontSize: "0.95rem", letterSpacing: "0.02em" }}>
                      {formatHour(slot.start, timezone)}
                    </strong>
                    {!barberId && (
                      <span style={{ fontSize: "0.55rem", opacity: active ? 0.8 : 0.4, fontWeight: 700, textTransform: "uppercase" }}>
                        {slot.barberName.split(" ")[0]}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="notice" style={{ gridColumn: "span 3", textAlign: "center", fontSize: "0.85rem", opacity: 0.7 }}>
                {date ? "No hay turnos para este día." : "Seleccioná un día para ver horarios."}
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: PERSONAL DATA & CONFIRMATION */}
        <div ref={step3Ref} className="stack" style={{ gap: 20, padding: "20px 0", borderTop: "1px solid var(--line)", scrollMarginTop: "140px" }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "white" }}>Finalizar Reserva</h2>
            <p className="muted" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Confirmá los detalles para asegurar tu lugar.</p>
          </div>

          <div className="stack" style={{ gap: 24 }}>
            {/* TICKET SUMMARY (Compact & Balanced) */}
            <div className="summary-card" style={{ 
              background: "#161616", 
              border: "1px solid rgba(245, 200, 66, 0.3)", 
              padding: "16px",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
            }}>
              <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.65rem", display: "block", marginBottom: "16px", letterSpacing: "0.05em", fontWeight: 900 }}>DETALLE DEL TURNO</span>
              
              <div className="stack" style={{ gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "2px" }}>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Servicio</span>
                  <strong style={{ fontSize: "0.8rem", color: "white" }}>{selectedService?.name || "-"}</strong>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "2px" }}>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Profesional</span>
                  <strong style={{ fontSize: "0.8rem", color: "white" }}>{selectedSlot?.barberName?.split(" ")[0] || "-"}</strong>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Fecha y Hora</span>
                  <strong style={{ fontSize: "0.8rem", color: "var(--accent)" }}>
                    {selectedSlot ? formatDateTime(selectedSlot.start, timezone).replace(" ", " \u00B7 ") : "-"}
                  </strong>
                </div>
              </div>

              <div style={{ height: "1px", background: "rgba(245, 200, 66, 0.2)", margin: "10px 0" }} />
              
              <div className="summary-row" style={{ justifyContent: "space-between", display: "flex", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>TOTAL</span>
                <span className="price-tag" style={{ fontSize: "1.25rem", color: "var(--accent)", fontWeight: 900 }}>{selectedService ? formatCurrency(selectedService.price) : "-"}</span>
              </div>
            </div>

            {/* INPUTS SECTION (High Contrast Refined) */}
            <div className="stack" style={{ gap: 24 }}>
              {error ? <div className="notice error" style={{ fontSize: "0.85rem", padding: "12px", background: "rgba(255,100,100,0.1)", border: "1px solid #ff4444", borderRadius: "8px" }}>{error}</div> : null}
              
              <div className="grid cols-2-mobile-stack" style={{ gap: "24px" }}>
                <div className="stack" style={{ gap: 10, flex: 1 }}>
                  <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Nombre completo</span>
                  <input 
                    value={name} 
                    onChange={(event) => setName(event.target.value)} 
                    placeholder="Tu nombre y apellido" 
                    style={{ 
                      padding: "16px", 
                      borderRadius: "12px", 
                      fontSize: "1rem",
                      background: "#1c1c1c",
                      border: "2px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      outline: "none",
                      width: "100%"
                    }} 
                  />
                  {fieldErrors.name ? <small style={{ color: "#ff8484", fontSize: "0.75rem", fontWeight: 600 }}>{fieldErrors.name}</small> : null}
                </div>
                
                <div className="stack" style={{ gap: 10, flex: 1 }}>
                  <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>WhatsApp</span>
                  <input 
                    value={phone} 
                    onChange={(event) => setPhone(event.target.value)} 
                    placeholder="Ej: 11 1234 5678" 
                    style={{ 
                      padding: "16px", 
                      borderRadius: "12px", 
                      fontSize: "1rem",
                      background: "#1c1c1c",
                      border: "2px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      outline: "none",
                      width: "100%"
                    }} 
                  />
                  {fieldErrors.phone ? <small style={{ color: "#ff8484", fontSize: "0.75rem", fontWeight: 600 }}>{fieldErrors.phone}</small> : null}
                </div>
              </div>

              <div className="stack" style={{ gap: 10 }}>
                <span className="eyebrow" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800 }}>Notas (opcional)</span>
                <textarea 
                  value={notes} 
                  onChange={(event) => setNotes(event.target.value)} 
                  rows={2} 
                  style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    fontSize: "1rem", 
                    resize: "none",
                    background: "#1c1c1c",
                    border: "2px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                    outline: "none",
                    width: "100%"
                  }} 
                />
              </div>
            </div>
          </div>

          <div className="stack" style={{ gap: 14 }}>
            <button 
              className="btn" 
              type="button" 
              disabled={submitting || !selectedSlot || !selectedService} 
              onClick={handleSubmit}
              style={{ width: "100%", height: "56px", fontSize: "1.1rem", fontWeight: 800 }}
            >
              {submitting ? "Procesando..." : "Confirmar Reserva"}
            </button>
            
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Link className="btn-ghost" href={`/${slug}`} style={{ border: "none", opacity: 0.5, fontSize: "0.8rem" }}>
                Cancelar y volver
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
