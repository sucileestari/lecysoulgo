import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type Role = {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Permission = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

export type RolePermission = {
  role_id: string;
  permission_id: string;
};

/* =========================================
   HELPER
========================================= */

function isSuperAdminRole(
  roleName: string | null | undefined,
): boolean {
  return (
    String(roleName ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_") ===
    "super_admin"
  );
}

/* =========================================
   GET ALL ROLES
========================================= */

export async function getAllRoles() {
  const {
    data,
    error,
  } = await supabase
    .from("roles")
    .select("*")
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Gagal mengambil roles: ${error.message}`,
    );
  }

  return data ?? [];
}

/* =========================================
   GET ROLE BY ID
========================================= */

export async function getRoleById(
  roleId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal mengambil role: ${error.message}`,
    );
  }

  return data;
}

/* =========================================
   GET ALL PERMISSIONS
========================================= */

export async function getAllPermissions() {
  const {
    data,
    error,
  } = await supabase
    .from("permissions")
    .select("*")
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Gagal mengambil permissions: ${error.message}`,
    );
  }

  return data ?? [];
}

/* =========================================
   GET ROLE PERMISSIONS
========================================= */

export async function getRolePermissions(
  roleId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("role_permissions")
    .select(`
      role_id,
      permission_id,
      permissions (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq("role_id", roleId);

  if (error) {
    throw new Error(
      `Gagal mengambil role permissions: ${error.message}`,
    );
  }

  /*
   * Flatten response supaya frontend
   * bisa langsung membaca:
   *
   * permission.id
   * permission.name
   *
   * bukan:
   *
   * permission.permissions.id
   */

  return (data ?? [])
    .map((item) => {
      const permission =
        Array.isArray(item.permissions)
          ? item.permissions[0]
          : item.permissions;

      if (!permission) {
        return null;
      }

      return {
        id: permission.id,
        name: permission.name,
        description:
          permission.description ?? null,
        created_at:
          permission.created_at,
        role_id: item.role_id,
        permission_id:
          item.permission_id,
      };
    })
    .filter(
      (
        permission,
      ): permission is NonNullable<
        typeof permission
      > => Boolean(permission),
    );
}

/* =========================================
   GET ROLE DETAIL + PERMISSIONS
========================================= */

export async function getRoleWithPermissions(
  roleId: string,
) {
  const role =
    await getRoleById(
      roleId,
    );

  if (!role) {
    const error =
      new Error(
        "Role tidak ditemukan.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_NOT_FOUND";

    throw error;
  }

  const permissions =
    await getRolePermissions(
      roleId,
    );

  return {
    role,
    permissions,
  };
}

/* =========================================
   UPDATE ROLE PERMISSIONS
========================================= */

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[],
) {
  /* =======================================
     CHECK ROLE
  ======================================== */

  const role =
    await getRoleById(
      roleId,
    );

  if (!role) {
    const error =
      new Error(
        "Role tidak ditemukan.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_NOT_FOUND";

    throw error;
  }

  /* =======================================
     PROTECT SUPER ADMIN
  ======================================== */

  /*
   * Super Admin tidak boleh diubah
   * permission-nya dari halaman ini.
   *
   * Gunakan role.name, bukan role.id,
   * karena role.id kemungkinan UUID.
   */

  if (
    isSuperAdminRole(
      role.name,
    )
  ) {
    const error =
      new Error(
        "Permission Super Admin tidak dapat diubah.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "SUPER_ADMIN_PROTECTED";

    throw error;
  }

  /* =======================================
     NORMALIZE PERMISSION IDS
  ======================================== */

  const uniquePermissionIds =
    Array.from(
      new Set(
        (permissionIds ?? [])
          .filter(
            (id): id is string =>
              typeof id === "string",
          )
          .map((id) =>
            id.trim(),
          )
          .filter(Boolean),
      ),
    );

  /* =======================================
     VALIDATE PERMISSION IDS
  ======================================== */

  if (
    uniquePermissionIds.length >
    0
  ) {
    const {
      data: permissions,
      error: permissionError,
    } = await supabase
      .from("permissions")
      .select("id")
      .in(
        "id",
        uniquePermissionIds,
      );

    if (permissionError) {
      throw new Error(
        `Gagal memvalidasi permissions: ${permissionError.message}`,
      );
    }

    const validIds =
      new Set(
        (permissions ?? []).map(
          (permission) =>
            permission.id,
        ),
      );

    const invalidIds =
      uniquePermissionIds.filter(
        (id) =>
          !validIds.has(id),
      );

    if (
      invalidIds.length >
      0
    ) {
      const error =
        new Error(
          `Permission tidak ditemukan: ${invalidIds.join(", ")}`,
        );

      (
        error as Error & {
          code?: string;
        }
      ).code =
        "INVALID_PERMISSION_IDS";

      throw error;
    }
  }

  /* =======================================
     DELETE CURRENT PERMISSIONS
  ======================================== */

  const {
    error: deleteError,
  } = await supabase
    .from("role_permissions")
    .delete()
    .eq(
      "role_id",
      roleId,
    );

  if (deleteError) {
    throw new Error(
      `Gagal menghapus permission lama: ${deleteError.message}`,
    );
  }

  /* =======================================
     INSERT NEW PERMISSIONS
  ======================================== */

  if (
    uniquePermissionIds.length >
    0
  ) {
    const rows =
      uniquePermissionIds.map(
        (permissionId) => ({
          role_id:
            roleId,
          permission_id:
            permissionId,
        }),
      );

    const {
      error: insertError,
    } = await supabase
      .from("role_permissions")
      .insert(rows);

    if (insertError) {
      throw new Error(
        `Gagal menyimpan permission: ${insertError.message}`,
      );
    }
  }

  /* =======================================
     RETURN UPDATED DATA
  ======================================== */

  return getRoleWithPermissions(
    roleId,
  );
}

/* =========================================
   CREATE ROLE
========================================= */

export async function createRole(
  name: string,
  description?: string,
) {
  const normalizedName =
    name.trim();

  if (!normalizedName) {
    const error =
      new Error(
        "Nama role wajib diisi.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_NAME_REQUIRED";

    throw error;
  }

  /* =======================================
     CHECK DUPLICATE
  ======================================== */

  const {
    data: existingRole,
    error: existingError,
  } = await supabase
    .from("roles")
    .select("id")
    .ilike(
      "name",
      normalizedName,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Gagal memeriksa role: ${existingError.message}`,
    );
  }

  if (existingRole) {
    const error =
      new Error(
        "Role dengan nama tersebut sudah ada.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_ALREADY_EXISTS";

    throw error;
  }

  /* =======================================
     INSERT
  ======================================== */

  const {
    data,
    error,
  } = await supabase
    .from("roles")
    .insert({
      name: normalizedName,
      description:
        description?.trim() ||
        null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Gagal membuat role: ${error.message}`,
    );
  }

  return data;
}

/* =========================================
   UPDATE ROLE
========================================= */

export async function updateRole(
  roleId: string,
  name: string,
  description?: string,
) {
  const normalizedName =
    name.trim();

  if (!normalizedName) {
    const error =
      new Error(
        "Nama role wajib diisi.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_NAME_REQUIRED";

    throw error;
  }

  const role =
    await getRoleById(
      roleId,
    );

  if (!role) {
    const error =
      new Error(
        "Role tidak ditemukan.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_NOT_FOUND";

    throw error;
  }

  /* =======================================
     PREVENT SUPER ADMIN RENAME
  ======================================== */

  if (
    isSuperAdminRole(
      role.name,
    )
  ) {
    const error =
      new Error(
        "Role Super Admin tidak dapat diubah.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "SUPER_ADMIN_PROTECTED";

    throw error;
  }

  /* =======================================
     CHECK DUPLICATE
  ======================================== */

  const {
    data: duplicate,
    error: duplicateError,
  } = await supabase
    .from("roles")
    .select("id")
    .ilike(
      "name",
      normalizedName,
    )
    .neq(
      "id",
      roleId,
    )
    .maybeSingle();

  if (duplicateError) {
    throw new Error(
      `Gagal memeriksa role: ${duplicateError.message}`,
    );
  }

  if (duplicate) {
    const error =
      new Error(
        "Role dengan nama tersebut sudah ada.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_ALREADY_EXISTS";

    throw error;
  }

  /* =======================================
     UPDATE
  ======================================== */

  const {
    data,
    error,
  } = await supabase
    .from("roles")
    .update({
      name: normalizedName,
      description:
        description?.trim() ||
        null,
    })
    .eq(
      "id",
      roleId,
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Gagal mengubah role: ${error.message}`,
    );
  }

  return data;
}

/* =========================================
   DELETE ROLE
========================================= */

export async function deleteRole(
  roleId: string,
) {
  /* =======================================
     GET ROLE
  ======================================== */

  const role =
    await getRoleById(
      roleId,
    );

  if (!role) {
    const error =
      new Error(
        "Role tidak ditemukan.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "ROLE_NOT_FOUND";

    throw error;
  }

  /* =======================================
     PROTECT SUPER ADMIN
  ======================================== */

  if (
    isSuperAdminRole(
      role.name,
    )
  ) {
    const error =
      new Error(
        "Role Super Admin tidak dapat dihapus.",
      );

    (
      error as Error & {
        code?: string;
      }
    ).code =
      "SUPER_ADMIN_PROTECTED";

    throw error;
  }

  /* =======================================
     DELETE ROLE PERMISSIONS
  ======================================== */

  const {
    error: permissionError,
  } = await supabase
    .from("role_permissions")
    .delete()
    .eq(
      "role_id",
      roleId,
    );

  if (permissionError) {
    throw new Error(
      `Gagal menghapus role permissions: ${permissionError.message}`,
    );
  }

  /* =======================================
     DELETE ROLE
  ======================================== */

  const {
    error,
  } = await supabase
    .from("roles")
    .delete()
    .eq(
      "id",
      roleId,
    );

  if (error) {
    throw new Error(
      `Gagal menghapus role: ${error.message}`,
    );
  }

  return {
    id: roleId,
  };
}