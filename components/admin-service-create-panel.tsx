"use client";

import { useState } from "react";

type AdminServiceCreatePanelProps = {
  tenantSlug: string;
};

export function AdminServiceCreatePanel({ tenantSlug }: AdminServiceCreatePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="header-row" style={{ alignItems: "center" }}>
        <button type="button" className="btn" onClick={() => setOpen((current) => !current)}>
          {open ? "Ocultar formulario" : "Crear servicio"}
        </button>
      </div>

      {open ? (
        <form method="post" action={`/api/owner/${tenantSlug}/admin`} className="card stack" style={{ padding: 20, gap: 12 }}>
          <input type="hidden" name="intent" value="service-create" />
          <input type="hidden" name="section" value="services" />
          <div className="grid cols-2" style={{ gap: 12 }}>
            <label>Nombre<input name="name" required /></label>
            <label>Duración<input name="durationMinutes" type="number" min="5" step="5" defaultValue="30" required /></label>
            <label>Precio<input name="price" type="number" min="0" step="0.01" defaultValue="0" required /></label>
            <label>Orden<input name="sortOrder" type="number" min="0" step="1" defaultValue="0" /></label>
          </div>
          <label>Descripción<textarea name="description" rows={3} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="isPromotion" />
            <span>Marcar como promoción</span>
          </label>
          <div><button className="btn" type="submit">Guardar nuevo servicio</button></div>
        </form>
      ) : null}
    </div>
  );
}
