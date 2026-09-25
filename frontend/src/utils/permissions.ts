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
   PERMISSION NORMALIZER
========================================= */

function normalizePermission(
  permission: unknown,
): string {
  return String(permission ?? "")
    .trim()
    .toLowerCase();
}

/* =========================================
   GET CURRENT ADMIN USER
========================================= */

export function getCurrentAdminUser(): AuthUser | null {
  try {
    const rawUser =
      localStorage.getItem("auth_user");

    if (!rawUser) {
      return null;
    }

    const parsedUser =
      JSON.parse(rawUser);

    if (
      !parsedUser ||
      typeof parsedUser !== "object"
    ) {
      return null;
    }

    const user =
      parsedUser as Partial<AuthUser>;

    return {
      id: String(user.id ?? ""),
      name: String(user.name ?? ""),
      username: String(
        user.username ?? "",
      ),
      role_id: String(
        user.role_id ?? "",
      ),
      role: String(user.role ?? ""),
      permissions: Array.isArray(
        user.permissions,
      )
        ? user.permissions
            .map(
              normalizePermission,
            )
            .filter(Boolean)
        : [],
      is_active:
        user.is_active === true,
    };
  } catch {
    return null;
  }
}

/* =========================================
   CHECK SUPER ADMIN
========================================= */

export function isSuperAdmin(): boolean {
  const user =
    getCurrentAdminUser();

  if (!user) {
    return false;
  }

  /*
   * Backend mengirim role sebagai:
   *
   * "Super Admin"
   * atau
   * "super_admin"
   *
   * Gunakan role sebagai sumber utama
   * untuk menentukan Super Admin.
   */

  const role =
    String(user.role ?? "")
      .trim()
      .toLowerCase();

  return (
    role === "super admin" ||
    role === "super_admin"
  );
}

/* =========================================
   GET CURRENT PERMISSIONS
========================================= */

export function getCurrentPermissions(): string[] {
  const user =
    getCurrentAdminUser();

  if (!user) {
    return [];
  }

  /*
   * SUPER ADMIN
   *
   * Super Admin mempunyai
   * seluruh permission.
   */
  if (isSuperAdmin()) {
    return ["*"];
  }

  /*
   * ADMIN / ROLE LAIN
   *
   * Gunakan permission yang
   * diberikan oleh backend.
   */
  return Array.isArray(
    user.permissions,
  )
    ? user.permissions
        .map(
          normalizePermission,
        )
        .filter(Boolean)
    : [];
}

/* =========================================
   GET REGISTERED PERMISSION CODES
========================================= */

export function getRegisteredPermissionCodes():
  Set<string> | null {
  try {
    const storedPermissions =
      localStorage.getItem(
        "auth_registered_permissions",
      );

    /*
     * Registry seharusnya selalu tersedia
     * setelah admin berhasil login.
     */
    if (!storedPermissions) {
      return null;
    }

    const permissions =
      JSON.parse(
        storedPermissions,
      );

    if (!Array.isArray(permissions)) {
      return null;
    }

    return new Set<string>(
      permissions
        .map(
          normalizePermission,
        )
        .filter(Boolean),
    );
  } catch {
    return null;
  }
}

/* =========================================
   CHECK CONFIGURED PERMISSION
========================================= */

export function canAccessPermission(
  permission?: string,
): boolean {
  /*
   * Menu / button / route tidak
   * mempunyai permission.
   *
   * Berarti tidak dibatasi permission.
   */
  if (!permission?.trim()) {
    return true;
  }

  const normalizedPermission =
    normalizePermission(
      permission,
    );

  /*
   * Registry permission harus sudah
   * tersedia setelah login.
   *
   * LoginPage akan membatalkan login
   * jika registry gagal dimuat.
   *
   * Jadi kondisi ini dianggap sebagai
   * session permission yang tidak valid.
   */
  const registeredPermissionCodes =
    getRegisteredPermissionCodes();

  if (!registeredPermissionCodes) {
    return false;
  }

  /*
   * Permission belum terdaftar
   * di database.
   *
   * Sesuai rule aplikasi:
   * permission yang belum terdaftar
   * tidak membatasi UI.
   */
  if (
    !registeredPermissionCodes.has(
      normalizedPermission,
    )
  ) {
    return true;
  }

  /*
   * Permission sudah terdaftar
   * di database.
   *
   * Sekarang cek apakah user
   * benar-benar memiliki permission.
   */
  return hasPermission(
    normalizedPermission,
  );
}

/* =========================================
   HAS PERMISSION
========================================= */

export function hasPermission(
  permission: string,
): boolean {
  const normalizedPermission =
    normalizePermission(
      permission,
    );

  /*
   * Permission kosong.
   */
  if (!normalizedPermission) {
    return false;
  }

  const permissions =
    getCurrentPermissions();

  /*
   * Wildcard (*)
   *
   * Berarti user mempunyai
   * seluruh permission.
   */
  if (permissions.includes("*")) {
    return true;
  }

  /*
   * Permission spesifik.
   *
   * Keduanya sudah dinormalisasi
   * ke lowercase.
   */
  return permissions.includes(
    normalizedPermission,
  );
}

/* =========================================
   HAS ANY PERMISSION
========================================= */

export function hasAnyPermission(
  permissions: string[],
): boolean {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.some(
    (permission) =>
      hasPermission(permission),
  );
}

/* =========================================
   HAS ALL PERMISSIONS
========================================= */

export function hasAllPermissions(
  permissions: string[],
): boolean {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.every(
    (permission) =>
      hasPermission(permission),
  );
}