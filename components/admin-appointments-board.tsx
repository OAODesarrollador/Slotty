"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type StatusOption = {
  value: string;
  label: string;
};

type OccupiedSlot = {
  kind: "occupied";
  key: string;
  startLabel: string;
  endLabel: string;
  barberId: string;
  scheduleDate: string;
  appointmentId: string;
  customerName: string;
  serviceName: string;
  appointmentStatusLabel: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  currentStatus: string;
};

type FreeSlot = {
  kind: "free";
  key: string;
  startLabel: string;
  endLabel: string;
  barberId: string;
  scheduleDate: string;
  scheduledAt: string;
};

type SlotItem = OccupiedSlot | FreeSlot;

type AdminAppointmentsBoardProps = {
  tenantSlug: string;
  slots: SlotItem[];
  statusOptions: StatusOption[];
  serviceOptions: Array<{ value: string; label: string }>;
  paymentOptions: Array<{ value: string; label: string }>;
};

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-edit-icon">
      <path
        d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Zm14.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.17 1.17 3.75 3.75 1.33-1.46Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AdminAppointmentsBoard({ tenantSlug, slots, statusOptions, serviceOptions, paymentOptions }: AdminAppointmentsBoardProps) {
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!activeSlotKey) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeSlotKey]);

  const activeSlot = slots.find((slot) => slot.key === activeSlotKey) ?? null;

  return (
    <>
      <div className="admin-calendar-grid">
        {slots.map((slot) => (
          <div key={slot.key} className={`admin-calendar-card ${slot.kind === "occupied" ? "is-occupied" : "is-free"}`}>
            <button
              type="button"
              className="admin-calendar-card__edit"
              aria-label="Editar horario"
              onClick={() => setActiveSlotKey(slot.key)}
            >
              <PencilIcon />
            </button>

            <div className="admin-calendar-card__time-row">
              <div className="admin-calendar-card__time">
                <div className="admin-calendar-time-block">
                  <strong>{slot.startLabel}</strong>
                </div>
                <div className="admin-calendar-time-block">
                  <small>{slot.endLabel}</small>
                </div>
              </div>
              <div className="admin-calendar-field admin-calendar-field--service">
                <span className="admin-calendar-field__label">{slot.kind === "occupied" ? "Servicio" : "Estado"}</span>
                <span className="admin-calendar-field__value">{slot.kind === "occupied" ? slot.serviceName : "Horario libre"}</span>
              </div>
            </div>

            <div className="admin-calendar-card__body">
              <div className="stack" style={{ gap: 4 }}>
                <div className="admin-calendar-field">
                  <span className="admin-calendar-field__label">{slot.kind === "occupied" ? "Cliente" : "Detalle"}</span>
                  <strong className="admin-calendar-field__value">
                    {slot.kind === "occupied" ? slot.customerName : "Disponible para asignar o reservar."}
                  </strong>
                </div>
              </div>

              <div className="admin-calendar-card__meta">
                {slot.kind === "occupied" ? (
                  <>
                    <span className="status-pill">Estado: {slot.appointmentStatusLabel}</span>
                    <span className="status-pill">Pago: {slot.paymentMethodLabel}</span>
                    <span className="status-pill">Cobro: {slot.paymentStatusLabel}</span>
                  </>
                ) : (
                  <span className="status-pill">Libre</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {mounted && activeSlot
        ? createPortal(
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setActiveSlotKey(null)}>
              <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
                <div className="admin-modal__header">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Editar horario</span>
                    <h3 style={{ fontSize: "1.45rem" }}>{activeSlot.startLabel} - {activeSlot.endLabel}</h3>
                  </div>
                  <button type="button" className="admin-modal__close" aria-label="Cerrar" onClick={() => setActiveSlotKey(null)}>
                    ×
                  </button>
                </div>

                {activeSlot.kind === "occupied" ? (
                  <form method="post" action={`/api/owner/${tenantSlug}/admin`} className="stack" style={{ gap: 16 }}>
                    <input type="hidden" name="intent" value="appointment-status-update" />
                    <input type="hidden" name="section" value="appointments" />
                    <input type="hidden" name="appointmentId" value={activeSlot.appointmentId} />
                    <input type="hidden" name="barberId" value={activeSlot.barberId} />
                    <input type="hidden" name="date" value={activeSlot.scheduleDate} />

                    <div className="grid cols-2" style={{ gap: 12 }}>
                      <div className="card stack" style={{ padding: 18, gap: 8 }}>
                        <span className="admin-calendar-field__label">Servicio</span>
                        <strong className="admin-calendar-field__value">{activeSlot.serviceName}</strong>
                      </div>
                      <div className="card stack" style={{ padding: 18, gap: 8 }}>
                        <span className="admin-calendar-field__label">Cliente</span>
                        <strong className="admin-calendar-field__value">{activeSlot.customerName}</strong>
                      </div>
                    </div>

                    <div className="admin-calendar-card__meta" style={{ marginTop: 0 }}>
                      <span className="status-pill">Estado: {activeSlot.appointmentStatusLabel}</span>
                      <span className="status-pill">Pago: {activeSlot.paymentMethodLabel}</span>
                      <span className="status-pill">Cobro: {activeSlot.paymentStatusLabel}</span>
                    </div>

                    <label>
                      Estado del turno
                      <select name="status" defaultValue={activeSlot.currentStatus}>
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </label>

                    <div className="admin-modal__footer">
                      <button type="button" className="btn-ghost" onClick={() => setActiveSlotKey(null)}>Cerrar</button>
                      <button type="submit" className="btn">Guardar cambios</button>
                    </div>
                  </form>
                ) : (
                  serviceOptions.length > 0 && paymentOptions.length > 0 ? (
                    <form method="post" action={`/api/owner/${tenantSlug}/admin`} className="stack" style={{ gap: 16 }}>
                      <input type="hidden" name="intent" value="appointment-create-manual" />
                      <input type="hidden" name="section" value="appointments" />
                      <input type="hidden" name="barberId" value={activeSlot.barberId} />
                      <input type="hidden" name="date" value={activeSlot.scheduleDate} />
                      <input type="hidden" name="scheduledAt" value={activeSlot.scheduledAt} />

                      <div className="card stack" style={{ padding: 18, gap: 8 }}>
                        <span className="admin-calendar-field__label">Estado</span>
                        <strong className="admin-calendar-field__value">Horario libre</strong>
                      </div>

                      <div className="grid cols-2" style={{ gap: 12 }}>
                        <label>
                          Servicio
                          <select name="serviceId" required defaultValue={serviceOptions[0]?.value ?? ""}>
                            {serviceOptions.map((service) => (
                              <option key={service.value} value={service.value}>{service.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Metodo de pago
                          <select name="paymentMethod" required defaultValue={paymentOptions[0]?.value ?? ""}>
                            {paymentOptions.map((payment) => (
                              <option key={payment.value} value={payment.value}>{payment.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Cliente
                          <input name="customerName" required placeholder="Nombre del cliente" />
                        </label>
                        <label>
                          Telefono
                          <input name="customerPhone" required placeholder="Telefono" />
                        </label>
                      </div>

                      <label>
                        Notas
                        <textarea name="customerNotes" rows={3} placeholder="Dato opcional para registrar en la reserva" />
                      </label>

                      <div className="notice">
                        El método de pago se registrará solo como información administrativa. Este flujo no inicia ningún proceso de cobro.
                      </div>

                      <div className="admin-modal__footer">
                        <button type="button" className="btn-ghost" onClick={() => setActiveSlotKey(null)}>Cerrar</button>
                        <button type="submit" className="btn">Reservar horario</button>
                      </div>
                    </form>
                  ) : (
                    <div className="stack" style={{ gap: 16 }}>
                      <div className="card stack" style={{ padding: 18, gap: 8 }}>
                        <span className="admin-calendar-field__label">Estado</span>
                        <strong className="admin-calendar-field__value">Horario libre</strong>
                      </div>
                      <div className="notice">Este barbero necesita al menos un servicio asignado y un método de pago habilitado para registrar la reserva manual.</div>
                      <div className="admin-modal__footer">
                        <button type="button" className="btn-ghost" onClick={() => setActiveSlotKey(null)}>Cerrar</button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
