"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  isPromotion: boolean;
  sortOrder: number;
  isActive: boolean;
};

type AdminServicesTableProps = {
  tenantSlug: string;
  services: ServiceRow[];
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-edit-icon">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Zm-1 10h12l1-13H5l1 13Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AdminServicesTable({ tenantSlug, services }: AdminServicesTableProps) {
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeModal = editingId ?? deletingId;

  useEffect(() => {
    if (!activeModal) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeModal]);

  const editingService = useMemo(
    () => services.find((service) => service.id === editingId) ?? null,
    [editingId, services]
  );

  const deletingService = useMemo(
    () => services.find((service) => service.id === deletingId) ?? null,
    [deletingId, services]
  );

  return (
    <>
      <div className="admin-table-shell">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Duración</th>
              <th>Precio</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Promoción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <div className="admin-table__service">
                    <strong>{service.name}</strong>
                    <small>{service.description ?? "Sin descripción"}</small>
                  </div>
                </td>
                <td>{service.durationMinutes} min</td>
                <td>${service.price}</td>
                <td>{service.sortOrder}</td>
                <td>
                  <span className={`admin-table__badge ${service.isActive ? "is-active" : "is-inactive"}`}>
                    {service.isActive ? "Activo" : "Archivado"}
                  </span>
                </td>
                <td>
                  <span className={`admin-table__badge ${service.isPromotion ? "is-promo" : "is-neutral"}`}>
                    {service.isPromotion ? "Sí" : "No"}
                  </span>
                </td>
                <td>
                  <div className="admin-table__actions">
                    <button type="button" className="admin-table__icon-btn" aria-label="Editar servicio" onClick={() => setEditingId(service.id)}>
                      <PencilIcon />
                    </button>
                    <button type="button" className="admin-table__icon-btn is-danger" aria-label="Borrar servicio" onClick={() => setDeletingId(service.id)}>
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mounted && editingService
        ? createPortal(
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setEditingId(null)}>
              <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
                <div className="admin-modal__header">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Editar servicio</span>
                    <h3 style={{ fontSize: "1.45rem" }}>{editingService.name}</h3>
                  </div>
                  <button type="button" className="admin-modal__close" aria-label="Cerrar" onClick={() => setEditingId(null)}>
                    ×
                  </button>
                </div>

                <form method="post" action={`/api/owner/${tenantSlug}/admin`} className="stack" style={{ gap: 14 }}>
                  <input type="hidden" name="intent" value="service-update" />
                  <input type="hidden" name="section" value="services" />
                  <input type="hidden" name="serviceId" value={editingService.id} />

                  <div className="grid cols-2" style={{ gap: 12 }}>
                    <label>Nombre<input name="name" defaultValue={editingService.name} required /></label>
                    <label>Duración<input name="durationMinutes" type="number" min="5" step="5" defaultValue={editingService.durationMinutes} required /></label>
                    <label>Precio<input name="price" type="number" min="0" step="0.01" defaultValue={editingService.price} required /></label>
                    <label>Orden<input name="sortOrder" type="number" min="0" step="1" defaultValue={editingService.sortOrder} /></label>
                  </div>

                  <label>Descripción<textarea name="description" rows={3} defaultValue={editingService.description ?? ""} /></label>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" name="isPromotion" defaultChecked={editingService.isPromotion} />
                      <span>Promoción</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" name="isActive" defaultChecked={editingService.isActive} />
                      <span>Activo</span>
                    </label>
                  </div>

                  <div className="admin-modal__footer">
                    <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                    <button type="submit" className="btn">Guardar servicio</button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && deletingService
        ? createPortal(
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setDeletingId(null)}>
              <div className="admin-modal admin-modal--danger" onClick={(event) => event.stopPropagation()}>
                <div className="admin-modal__header">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Eliminar servicio</span>
                    <h3 style={{ fontSize: "1.45rem" }}>{deletingService.name}</h3>
                  </div>
                  <button type="button" className="admin-modal__close" aria-label="Cerrar" onClick={() => setDeletingId(null)}>
                    ×
                  </button>
                </div>

                <div className="stack" style={{ gap: 16 }}>
                  <div className="notice error">
                    Esta acción archivará el servicio y dejará de estar disponible para nuevas reservas. No revierte reservas ya creadas.
                  </div>

                  <div className="card stack" style={{ padding: 18, gap: 8 }}>
                    <span className="admin-calendar-field__label">Servicio</span>
                    <strong className="admin-calendar-field__value">{deletingService.name}</strong>
                    <small className="muted">{deletingService.durationMinutes} min | ${deletingService.price}</small>
                  </div>

                  <div className="admin-modal__footer">
                    <button type="button" className="btn-ghost" onClick={() => setDeletingId(null)}>Cancelar</button>
                    <form method="post" action={`/api/owner/${tenantSlug}/admin`}>
                      <input type="hidden" name="intent" value="service-delete" />
                      <input type="hidden" name="section" value="services" />
                      <input type="hidden" name="serviceId" value={deletingService.id} />
                      <button type="submit" className="btn">Confirmar borrado</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
