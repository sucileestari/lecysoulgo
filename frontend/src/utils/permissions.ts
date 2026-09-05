/* =========================================
   AUTH USER TYPE
========================================= */

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role_id: string;
  role: string;
  permissions: string[];
  is_active: boolean;
};

/* =========================================
   GET CURRENT ADMIN USER
========================================= */

export function getCurrentAdminUser(): AuthUser | null {
  try {
    const rawUser = localStorage.getItem("auth_user");

    if (!rawUser) {
      return null;
    }

    const user = JSON.parse(rawUser);

    if (!user || typeof user !== "object") {
      return null;
    }

    return user as AuthUser;
  } catch {
    return null;
  }
}

/* =========================================
   CHECK SUPER ADMIN
========================================= */

export function isSuperAdmin(): boolean {
  const user = getCurrentAdminUser();

  if (!user) {
    return false;
  }

  /*
   * Backend bisa mengirim role dalam beberapa format:
   *
   * "Super Admin"
   * "super_admin"
   *
   * Selain itu username super_admin juga
   * dianggap sebagai Super Admin.
   */

  const role = String(user.role ?? "")
    .trim()
    .toLowerCase();

  const username = String(user.username ?? "")
    .trim()
    .toLowerCase();

  return (
    role === "super admin" ||
    role === "super_admin" ||
    username === "super_admin"
  );
}

/* =========================================
   GET CURRENT PERMISSIONS
========================================= */

export function getCurrentPermissions(): string[] {
  const user = getCurrentAdminUser();

  if (!user) {
    return [];
  }

  /*
   * SUPER ADMIN
   *
   * Super Admin mempunyai seluruh permission.
   */
  if (isSuperAdmin()) {
    return ["*"];
  }

  /*
   * ADMIN / ROLE LAIN
   *
   * Gunakan permission yang diberikan
   * oleh backend.
   */
  if (Array.isArray(user.permissions)) {
    return user.permissions;
  }

  return [];
}

/* =========================================
   HAS PERMISSION
========================================= */

export function hasPermission(
  permission: string
): boolean {
  const permissions = getCurrentPermissions();

  /*
   * Tidak ada permission
   */
  if (!permission) {
    return false;
  }

  /*
   * Wildcard (*)
   *
   * Berarti user mempunyai seluruh permission.
   */
  if (permissions.includes("*")) {
    return true;
  }

  /*
   * Permission spesifik
   */
  return permissions.includes(permission);
}

/* =========================================
   HAS ANY PERMISSION
========================================= */

export function hasAnyPermission(
  permissions: string[]
): boolean {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.some((permission) =>
    hasPermission(permission)
  );
}

/* =========================================
   HAS ALL PERMISSIONS
========================================= */

export function hasAllPermissions(
  permissions: string[]
): boolean {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.every((permission) =>
    hasPermission(permission)
  );
}