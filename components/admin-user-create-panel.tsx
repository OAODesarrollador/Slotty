"use client";

import { FormEvent, useState } from "react";
import { AdminPasswordInput, PASSWORD_HELP, PASSWORD_PATTERN } from "@/components/admin-password-input";
import { AdminCreateTogglePanel } from "@/components/admin-create-toggle-panel";

type AdminUserCreatePanelProps = {
  tenantSlug: string;
};

export function AdminUserCreatePanel({ tenantSlug }: AdminUserCreatePanelProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const passwordIsSecure = PASSWORD_PATTERN.test(password);
  const canSubmit = passwordIsSecure && passwordsMatch;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSubmit) {
      event.preventDefault();
      setError(!passwordIsSecure ? PASSWORD_HELP : "Las contrasenas no coinciden.");
      return;
    }
    setError("");
  }

  return (
    <AdminCreateTogglePanel closedLabel="Crear usuario" openLabel="Ocultar formulario">
      <form method="post" action={`/api/owner/${tenantSlug}/admin`} className="card stack" style={{ padding: 20, gap: 12 }} onSubmit={handleSubmit}>
        <input type="hidden" name="intent" value="user-create" />
        <input type="hidden" name="section" value="company" />
        <div className="grid cols-2" style={{ gap: 12 }}>
          <label>Nombre<input name="displayName" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Rol<select name="role" defaultValue="staff"><option value="owner">Administrador</option><option value="staff">Recepcionista</option></select></label>
          <AdminPasswordInput
            password={password}
            passwordConfirm={passwordConfirm}
            visible={visible}
            required
            confirmRequired
            onPasswordChange={setPassword}
            onPasswordConfirmChange={setPasswordConfirm}
            onToggleVisible={() => setVisible((current) => !current)}
          />
        </div>
        {error ? <div className="notice error" style={{ padding: 12 }}>{error}</div> : null}
        <div><button className="btn" type="submit" disabled={!canSubmit}>Crear usuario</button></div>
      </form>
    </AdminCreateTogglePanel>
  );
}
