"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AdminPasswordInput, PASSWORD_PATTERN } from "@/components/admin-password-input";

type ServiceOption = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
};

type WorkingHour = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type BarberRow = {
  id: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  rating: string | number;
  userId: string | null;
  isActive: boolean;
  serviceIds: string[];
  workingHours: WorkingHour[];
};

type AdminCompanyBarbersTableProps = {
  tenantSlug: string;
  canEdit: boolean;
  barbers: BarberRow[];
  users: Pick<UserOption, "id" | "displayName">[];
  services: ServiceOption[];
  weekdayLabels: string[];
};

type AdminCompanyUsersTableProps = {
  tenantSlug: string;
  canEdit: boolean;
  users: UserOption[];
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

function useModalLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

function formatWorkingHours(barber: BarberRow) {
  if (barber.workingHours.length === 0) {
    return "Sin horarios";
  }

  return `${barber.workingHours.length} dias`;
}

export function AdminCompanyBarbersTable({
  tenantSlug,
  canEdit,
  barbers,
  users,
  services,
  weekdayLabels
}: AdminCompanyBarbersTableProps) {
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useModalLock(Boolean(editingId || deletingId));

  const editingBarber = useMemo(() => barbers.find((barber) => barber.id === editingId) ?? null, [barbers, editingId]);
  const deletingBarber = useMemo(() => barbers.find((barber) => barber.id === deletingId) ?? null, [barbers, deletingId]);

  return (
    <>
      <div className="admin-table-shell">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Barbero</th>
              <th>Rating</th>
              <th>Usuario</th>
              <th>Servicios</th>
              <th>Horarios</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {barbers.map((barber) => {
              const linkedUser = users.find((user) => user.id === barber.userId);
              const serviceNames = services.filter((service) => barber.serviceIds.includes(service.id)).map((service) => service.name);

              return (
                <tr key={barber.id}>
                  <td>
                    <div className="admin-table__profile">
                      {barber.photoUrl ? <img src={barber.photoUrl} alt={barber.fullName} className="admin-table__avatar" /> : <span className="status-pill">Sin foto</span>}
                      <div className="admin-table__service">
                        <strong>{barber.fullName}</strong>
                        <small>{barber.bio || "Sin bio"}</small>
                      </div>
                    </div>
                  </td>
                  <td>{barber.rating}</td>
                  <td>{linkedUser?.displayName ?? "Sin usuario"}</td>
                  <td>
                    <div className="admin-table__service">
                      <strong>{serviceNames.length}</strong>
                      <small>{serviceNames.slice(0, 2).join(", ") || "Sin servicios"}</small>
                    </div>
                  </td>
                  <td>{formatWorkingHours(barber)}</td>
                  <td>
                    <span className={`admin-table__badge ${barber.isActive ? "is-active" : "is-inactive"}`}>
                      {barber.isActive ? "Activo" : "Archivado"}
                    </span>
                  </td>
                  <td>
                    {canEdit ? (
                      <div className="admin-table__actions">
                        <button type="button" className="admin-table__icon-btn" aria-label="Editar barbero" onClick={() => setEditingId(barber.id)}>
                          <PencilIcon />
                        </button>
                        <button type="button" className="admin-table__icon-btn is-danger" aria-label="Archivar barbero" onClick={() => setDeletingId(barber.id)}>
                          <TrashIcon />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mounted && editingBarber
        ? createPortal(
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setEditingId(null)}>
              <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
                <div className="admin-modal__header">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Editar barbero</span>
                    <h3 style={{ fontSize: "1.45rem" }}>{editingBarber.fullName}</h3>
                  </div>
                  <button type="button" className="admin-modal__close" aria-label="Cerrar" onClick={() => setEditingId(null)}>
                    x
                  </button>
                </div>

                <form method="post" action={`/api/owner/${tenantSlug}/admin`} encType="multipart/form-data" className="stack" style={{ gap: 14 }}>
                  <input type="hidden" name="intent" value="barber-update" />
                  <input type="hidden" name="section" value="company" />
                  <input type="hidden" name="barberId" value={editingBarber.id} />
                  <input type="hidden" name="existingPhotoUrl" value={editingBarber.photoUrl ?? ""} />

                  <div className="grid cols-2" style={{ gap: 12 }}>
                    <label>Nombre<input name="fullName" defaultValue={editingBarber.fullName} /></label>
                    <label>Rating<input name="rating" type="number" min="0" max="5" step="0.1" defaultValue={editingBarber.rating} /></label>
                    <label>Usuario<select name="userId" defaultValue={editingBarber.userId ?? ""}><option value="">Sin usuario</option>{users.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label>
                    <label>Foto<input name="photo" type="file" accept="image/*" /></label>
                  </div>

                  <label>Bio<textarea name="bio" rows={3} defaultValue={editingBarber.bio ?? ""} /></label>

                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="isActive" defaultChecked={editingBarber.isActive} />
                    <span>Activo</span>
                  </label>

                  <div className="stack" style={{ gap: 8 }}>
                    <strong>Servicios</strong>
                    <div className="admin-modal__check-grid">
                      {services.map((service) => (
                        <label key={service.id}>
                          <input type="checkbox" name="serviceIds" value={service.id} defaultChecked={editingBarber.serviceIds.includes(service.id)} />
                          <span>{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="stack" style={{ gap: 8 }}>
                    <strong>Horarios</strong>
                    <div className="admin-modal__schedule-grid">
                      {weekdayLabels.map((label, index) => {
                        const row = editingBarber.workingHours.find((item) => item.dayOfWeek === index);
                        return (
                          <div key={label} className="admin-table__schedule-day">
                            <strong>{label}</strong>
                            <input name={`schedule_${index}_start`} type="time" defaultValue={row?.startTime.slice(0, 5) ?? ""} />
                            <input name={`schedule_${index}_end`} type="time" defaultValue={row?.endTime.slice(0, 5) ?? ""} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="admin-modal__footer">
                    <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                    <button type="submit" className="btn">Guardar barbero</button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && deletingBarber
        ? createPortal(
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setDeletingId(null)}>
              <div className="admin-modal admin-modal--danger" onClick={(event) => event.stopPropagation()}>
                <div className="admin-modal__header">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Archivar barbero</span>
                    <h3 style={{ fontSize: "1.45rem" }}>{deletingBarber.fullName}</h3>
                  </div>
                  <button type="button" className="admin-modal__close" aria-label="Cerrar" onClick={() => setDeletingId(null)}>
                    x
                  </button>
                </div>

                <div className="stack" style={{ gap: 16 }}>
                  <div className="notice error">El barbero dejará de estar disponible para nuevas operaciones administrativas.</div>
                  <div className="admin-modal__footer">
                    <button type="button" className="btn-ghost" onClick={() => setDeletingId(null)}>Cancelar</button>
                    <form method="post" action={`/api/owner/${tenantSlug}/admin`}>
                      <input type="hidden" name="intent" value="barber-delete" />
                      <input type="hidden" name="section" value="company" />
                      <input type="hidden" name="barberId" value={deletingBarber.id} />
                      <button type="submit" className="btn">Confirmar archivo</button>
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

export function AdminCompanyUsersTable({ tenantSlug, canEdit, users }: AdminCompanyUsersTableProps) {
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirm, setEditPasswordConfirm] = useState("");
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useModalLock(Boolean(editingId || deletingId));

  const editingUser = useMemo(() => users.find((user) => user.id === editingId) ?? null, [users, editingId]);
  const deletingUser = useMemo(() => users.find((user) => user.id === deletingId) ?? null, [users, deletingId]);
  const editPasswordIsValid = !isChangingPassword || (PASSWORD_PATTERN.test(editPassword) && editPassword === editPasswordConfirm);

  function openEditUser(userId: string) {
    setEditPassword("");
    setEditPasswordConfirm("");
    setEditPasswordVisible(false);
    setIsChangingPassword(false);
    setEditingId(userId);
  }

  function cancelPasswordChange() {
    setEditPassword("");
    setEditPasswordConfirm("");
    setEditPasswordVisible(false);
    setIsChangingPassword(false);
  }

  return (
    <>
      <div className="admin-table-shell">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="admin-table__service">
                    <strong>{user.displayName}</strong>
                    <small>{user.email}</small>
                  </div>
                </td>
                <td>
                  <span className={`admin-table__badge ${user.role === "owner" ? "is-promo" : "is-neutral"}`}>
                    {user.role === "owner" ? "Administrador" : "Recepcionista"}
                  </span>
                </td>
                <td>
                  <span className={`admin-table__badge ${user.isActive ? "is-active" : "is-inactive"}`}>
                    {user.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  {canEdit ? (
                    <div className="admin-table__actions">
                      <button type="button" className="admin-table__icon-btn" aria-label="Editar usuario" onClick={() => openEditUser(user.id)}>
                        <PencilIcon />
                      </button>
                      <button type="button" className="admin-table__icon-btn is-danger" aria-label="Desactivar usuario" onClick={() => setDeletingId(user.id)}>
                        <TrashIcon />
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mounted && editingUser
        ? createPortal(
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setEditingId(null)}>
              <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
                <div className="admin-modal__header">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Editar usuario</span>
                    <h3 style={{ fontSize: "1.45rem" }}>{editingUser.displayName}</h3>
                  </div>
                  <button type="button" className="admin-modal__close" aria-label="Cerrar" onClick={() => setEditingId(null)}>
                    x
                  </button>
                </div>

                <form method="post" action={`/api/owner/${tenantSlug}/admin`} className="stack" style={{ gap: 14 }}>
                  <input type="hidden" name="intent" value="user-update" />
                  <input type="hidden" name="section" value="company" />
                  <input type="hidden" name="userId" value={editingUser.id} />

                  <div className="grid cols-2" style={{ gap: 12 }}>
                    <label>Nombre<input name="displayName" defaultValue={editingUser.displayName} /></label>
                    <label>Email<input name="email" type="email" defaultValue={editingUser.email} /></label>
                    <label>Rol<select name="role" defaultValue={editingUser.role === "owner" ? "owner" : "staff"}><option value="owner">Administrador</option><option value="staff">Recepcionista</option></select></label>
                  </div>

                  {!isChangingPassword ? (
                    <div>
                      <button type="button" className="btn-ghost" onClick={() => setIsChangingPassword(true)}>
                        Cambiar contraseña
                      </button>
                    </div>
                  ) : (
                    <div className="stack" style={{ gap: 12 }}>
                      <div className="grid cols-2" style={{ gap: 12 }}>
                        <AdminPasswordInput
                          password={editPassword}
                          passwordConfirm={editPasswordConfirm}
                          visible={editPasswordVisible}
                          label="Nueva contraseña"
                          confirmLabel="Repetir nueva contraseña"
                          confirmPlaceholder="Repetí la nueva contraseña"
                          onPasswordChange={setEditPassword}
                          onPasswordConfirmChange={setEditPasswordConfirm}
                          onToggleVisible={() => setEditPasswordVisible((current) => !current)}
                        />
                      </div>
                      <div>
                        <button type="button" className="btn-ghost" onClick={cancelPasswordChange}>
                          Cancelar cambio de contraseña
                        </button>
                      </div>
                    </div>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="isActive" defaultChecked={editingUser.isActive} />
                    <span>Activo</span>
                  </label>

                  <div className="admin-modal__footer">
                    <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                    <button type="submit" className="btn" disabled={!editPasswordIsValid}>Guardar usuario</button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && deletingUser
        ? createPortal(
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setDeletingId(null)}>
              <div className="admin-modal admin-modal--danger" onClick={(event) => event.stopPropagation()}>
                <div className="admin-modal__header">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">Desactivar usuario</span>
                    <h3 style={{ fontSize: "1.45rem" }}>{deletingUser.displayName}</h3>
                  </div>
                  <button type="button" className="admin-modal__close" aria-label="Cerrar" onClick={() => setDeletingId(null)}>
                    x
                  </button>
                </div>

                <div className="stack" style={{ gap: 16 }}>
                  <div className="notice error">El usuario dejará de tener acceso activo al panel.</div>
                  <div className="admin-modal__footer">
                    <button type="button" className="btn-ghost" onClick={() => setDeletingId(null)}>Cancelar</button>
                    <form method="post" action={`/api/owner/${tenantSlug}/admin`}>
                      <input type="hidden" name="intent" value="user-delete" />
                      <input type="hidden" name="section" value="company" />
                      <input type="hidden" name="userId" value={deletingUser.id} />
                      <button type="submit" className="btn">Confirmar desactivacion</button>
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
