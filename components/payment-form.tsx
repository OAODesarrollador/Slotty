"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { formatCurrency, formatDateTime } from "@/lib/time";
import Link from "next/link";

interface PaymentFormProps {
  slug: string;
  serviceId: string;
  barberId: string;
  start: string;
  serviceName: string;
  barberName: string;
  tenantName: string;
  timezone: string;
  allowPayAtStore: boolean;
  allowBankTransfer: boolean;
  allowMercadoPago: boolean;
  breakdown: {
    totalAmount: number;
    amountRequiredNow: number;
    amountPendingAtStore: number;
  };
  initialError?: string;
}

export function PaymentForm({
  slug,
  serviceId,
  barberId,
  start,
  serviceName,
  barberName,
  tenantName,
  timezone,
  allowPayAtStore,
  allowBankTransfer,
  allowMercadoPago,
  breakdown,
  initialError
}: PaymentFormProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(initialError || null);
  const [validating, setValidating] = useState(false);

  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === "fullName" && !value.trim()) {
      error = "Por favor, ingresá tu nombre completo.";
    } else if (name === "phone") {
        if (!value.trim()) {
            error = "Necesitamos un teléfono para contactarte.";
        } else if (value.length < 8) {
            error = "El número de teléfono parece demasiado corto.";
        }
    }
    return error;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Validar todos los campos antes de enviar
    const newErrors: Record<string, string> = {};
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;

    const fullNameError = validateField("fullName", fullName);
    if (fullNameError) newErrors.fullName = fullNameError;

    const phoneError = validateField("phone", phone);
    if (phoneError) newErrors.phone = phoneError;

    if (Object.keys(newErrors).length > 0) {
      e.preventDefault();
      setFieldErrors(newErrors);
      setGeneralError("Hay detalles que requieren tu atención antes de continuar.");
      
      // Foco en el primer error
      const firstErrorField = Object.keys(newErrors)[0];
      const field = form.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      if (field) field.focus();
    } else {
      setValidating(true);
    }
  };

  const ErrorLabel = ({ name }: { name: string }) => {
    if (!fieldErrors[name]) return null;
    return (
      <small style={{ 
        color: "var(--danger)", 
        fontSize: "0.8rem", 
        marginTop: "6px", 
        display: "flex", 
        alignItems: "center", 
        gap: "4px",
        animation: "shake 0.4s ease" 
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {fieldErrors[name]}
      </small>
    );
  };

  return (
    <div className="shell grid cols-2 shadow-xl">
      {/* IZQUIERDA: FORMULARIO */}
      <section className="form-shell stack" style={{ alignSelf: "start", border: "none", background: "transparent", padding: 0, boxShadow: "none" }}>
        <div className="header-row">
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">Checkout Seguro</span>
            <h1>Confirmá tu Turno</h1>
          </div>
        </div>

        {generalError && (
          <div className="card" style={{ 
            background: "rgba(255, 127, 127, 0.05)", 
            border: "1px solid rgba(255, 127, 127, 0.2)", 
            borderRadius: "16px", 
            padding: "20px", 
            display: "flex", 
            gap: "16px", 
            alignItems: "center",
            animation: "shake 0.4s ease"
          }}>
            <div style={{ color: "var(--danger)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <strong style={{ color: "var(--danger)", fontSize: "0.95rem" }}>Atención</strong>
              <small className="muted">{generalError}</small>
            </div>
          </div>
        )}

        <form 
          id="payment-form" 
          method="post" 
          action={`/api/public/${slug}/appointments`} 
          className="stack" 
          style={{ gap: "32px" }}
          noValidate
          onSubmit={handleSubmit}
        >
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="barberId" value={barberId} />
          <input type="hidden" name="datetimeStart" value={start} />
          <input type="hidden" name="redirectBase" value={`/${slug}/reservar/${serviceId}/pago?barberId=${barberId}&start=${encodeURIComponent(start)}`} />

          <div className="stack" style={{ gap: "24px" }}>
            <div className="stack" style={{ gap: "12px" }}>
                <label>
                Nombre completo
                <input 
                    name="fullName" 
                    placeholder="Ej: Juan Pérez" 
                    required 
                    onChange={handleInputChange}
                    style={{ borderColor: fieldErrors.fullName ? "var(--danger)" : "rgba(255, 255, 255, 0.1)" }}
                />
                <ErrorLabel name="fullName" />
                </label>
            </div>

            <div className="grid cols-2" style={{ gap: "20px" }}>
              <div className="stack" style={{ gap: "12px" }}>
                <label>
                    Teléfono
                    <input 
                        name="phone" 
                        placeholder="Ej: +54 9 11..." 
                        required 
                        onChange={handleInputChange}
                        style={{ borderColor: fieldErrors.phone ? "var(--danger)" : "rgba(255, 255, 255, 0.1)" }}
                    />
                    <ErrorLabel name="phone" />
                </label>
              </div>
              <div className="stack" style={{ gap: "12px" }}>
                <label>
                    Email (Opcional)
                    <input type="email" name="email" placeholder="Para el comprobante" />
                </label>
              </div>
            </div>

            <label>
              Notas para el profesional
              <textarea name="notes" placeholder="¿Algún detalle especial?" rows={2} />
            </label>
          </div>

          <div className="stack" style={{ gap: "20px" }}>
            <span className="eyebrow">Seleccioná tu Método de Pago</span>
            <div className="grid" style={{ gap: "12px" }}>
              {allowPayAtStore && (
                <label className="service-card" style={{ cursor: "pointer", display: "flex", gap: "16px", padding: "20px", border: "1px solid var(--line)", flexDirection: "row", alignItems: "center" }}>
                  <input type="radio" name="paymentMethod" value="pay_at_store" defaultChecked style={{ width: "24px", height: "24px", margin: 0, accentColor: "var(--accent)" }} />
                  <div className="stack" style={{ gap: 2 }}>
                    <strong>Efectivo en el Local</strong>
                    <small className="muted">Pagás al finalizar tu atención.</small>
                  </div>
                </label>
              )}
              
              {allowBankTransfer && (
                <label className="service-card" style={{ cursor: "pointer", display: "flex", gap: "16px", padding: "20px", border: "1px solid var(--line)", flexDirection: "row", alignItems: "center" }}>
                  <input type="radio" name="paymentMethod" value="bank_transfer" style={{ width: "24px", height: "24px", margin: 0, accentColor: "var(--accent)" }} />
                  <div className="stack" style={{ gap: 2 }}>
                    <strong>Transferencia Bancaria</strong>
                    <small className="muted">Datos disponibles al confirmar.</small>
                  </div>
                </label>
              )}

              {allowMercadoPago && (
                <label className="service-card" style={{ cursor: "pointer", display: "flex", gap: "16px", padding: "20px", border: "1px solid var(--line)", flexDirection: "row", alignItems: "center" }}>
                  <input type="radio" name="paymentMethod" value="mercado_pago" style={{ width: "24px", height: "24px", margin: 0, accentColor: "var(--accent)" }} />
                  <div className="stack" style={{ gap: 2 }}>
                    <strong>Mercado Pago</strong>
                    <small className="muted">Crédito, Débito o Dinero en cuenta.</small>
                  </div>
                </label>
              )}
            </div>
          </div>

          <button className="btn" type="submit" disabled={validating} style={{ width: "100%", height: "64px", fontSize: "1.2rem", boxShadow: "0 10px 40px rgba(245, 200, 66, 0.2)" }}>
            {validating ? "Procesando..." : "Agendar Turno →"}
          </button>
        </form>
      </section>

      {/* DERECHA: RESUMEN */}
      <aside className="stack" style={{ gap: "24px" }}>
        <div className="card stack" style={{ background: "rgba(255, 255, 255, 0.02)", border: "2px dashed var(--line)", borderRadius: "32px", padding: "32px" }}>
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <span className="eyebrow" style={{ opacity: 0.6 }}>Resumen de Operación</span>
          </div>
          
          <div className="stack" style={{ gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="muted">Concepto</span>
              <strong style={{ fontSize: "1.1rem" }}>{serviceName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="muted">Profesional</span>
              <strong>{barberName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="muted">Fecha y Hora</span>
              <strong style={{ color: "var(--accent)" }}>{formatDateTime(start, timezone)}</strong>
            </div>
            
            <div style={{ height: "1px", background: "var(--line)", margin: "8px 0" }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Monto Total</span>
              <span className="price-tag" style={{ fontSize: "1.8rem" }}>{formatCurrency(breakdown.totalAmount)}</span>
            </div>
            
            {breakdown.amountRequiredNow > 0 && (
              <div className="metric-card" style={{ background: "rgba(245, 200, 66, 0.08)", borderColor: "var(--accent)", padding: "16px", borderRadius: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="stack" style={{ gap: 0 }}>
                    <small style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Pagar Ahora</small>
                    <span style={{ fontWeight: 800, color: "var(--accent)", fontSize: "1.1rem" }}>Seña de Reserva</span>
                  </div>
                  <strong style={{ color: "var(--accent)", fontSize: "1.3rem" }}>{formatCurrency(breakdown.amountRequiredNow)}</strong>
                </div>
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--muted)" }}>
              <span>A abonar en el local</span>
              <span>{formatCurrency(breakdown.amountPendingAtStore)}</span>
            </div>
          </div>
        </div>

        <Link href={`/${slug}/reservar/${serviceId}/confirmar?barberId=${barberId}&start=${encodeURIComponent(start)}`} className="btn-secondary" style={{ textAlign: "center", border: "none", background: "transparent", fontStyle: "italic", fontSize: "0.9rem" }}>
          ← Cambiar horario o barbero
        </Link>
      </aside>
    </div>
  );
}
