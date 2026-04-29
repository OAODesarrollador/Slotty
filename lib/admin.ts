import type { SessionUser } from "@/lib/types";

export function getManagementRoleLabel(role: SessionUser["role"]) {
  if (role === "owner") {
    return "Administrador";
  }

  if (role === "staff") {
    return "Recepcionista";
  }

  if (role === "barber") {
    return "Barbero";
  }

  return "Plataforma";
}

export function canManageCompany(role: SessionUser["role"]) {
  return role === "owner" || role === "platform_admin";
}

export function canManageUsers(role: SessionUser["role"]) {
  return role === "owner" || role === "platform_admin";
}
