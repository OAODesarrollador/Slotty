"use client";

import { useState } from "react";

type SensitiveSettings = {
  transferAlias: string;
  transferCbu: string;
  transferHolderName: string;
  transferBankName: string;
  mercadoPagoPublicKey: string;
  mercadoPagoAccessToken: string;
};

type AdminSensitiveCompanyFieldsProps = {
  tenantSlug: string;
  disabled?: boolean;
};

export function AdminSensitiveCompanyFields({ tenantSlug, disabled = false }: AdminSensitiveCompanyFieldsProps) {
  const [password, setPassword] = useState("");
  const [settings, setSettings] = useState<SensitiveSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUnlock() {
    if (disabled || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/owner/${tenantSlug}/sensitive-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "No se pudo desbloquear la sección.");
        return;
      }

      setSettings(payload as SensitiveSettings);
      setPassword("");
    } catch {
      setError("No se pudo verificar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="admin-sensitive-section stack" style={{ gap: 12 }}>
      <div className="header-row" style={{ alignItems: "center" }}>
        <div className="stack" style={{ gap: 4 }}>
          <strong>Datos sensibles</strong>
          <small className="muted">Credenciales de cobro y datos bancarios. Requiere contraseña de administrador.</small>
        </div>
        {settings ? <span className="admin-table__badge is-active">Desbloqueado</span> : <span className="admin-table__badge is-inactive">Bloqueado</span>}
      </div>

      {!settings ? (
        <div className="grid cols-2" style={{ gap: 12 }}>
          <label>
            Contraseña de administrador
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={disabled || loading}
              autoComplete="current-password"
            />
          </label>
          <div style={{ alignSelf: "end" }}>
            <button type="button" className="btn-ghost" disabled={disabled || loading || !password} onClick={handleUnlock}>
              {loading ? "Verificando..." : "Desbloquear"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="sensitiveFieldsUnlocked" value="true" />
          <div className="grid cols-2" style={{ gap: 12 }}>
            <label>Alias transferencia<input name="transferAlias" defaultValue={settings.transferAlias} disabled={disabled} /></label>
            <label>CBU<input name="transferCbu" defaultValue={settings.transferCbu} disabled={disabled} /></label>
            <label>Titular<input name="transferHolderName" defaultValue={settings.transferHolderName} disabled={disabled} /></label>
            <label>Banco<input name="transferBankName" defaultValue={settings.transferBankName} disabled={disabled} /></label>
            <label>MP Public Key<input name="mercadoPagoPublicKey" defaultValue={settings.mercadoPagoPublicKey} disabled={disabled} /></label>
            <label>MP Access Token<input name="mercadoPagoAccessToken" defaultValue={settings.mercadoPagoAccessToken} disabled={disabled} /></label>
          </div>
        </>
      )}

      {error ? <div className="notice error" style={{ padding: 12 }}>{error}</div> : null}
    </section>
  );
}
