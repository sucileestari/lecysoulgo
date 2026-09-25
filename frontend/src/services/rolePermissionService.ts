const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ""
).trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum dikonfigurasi."
  );
}

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
  code?: string;
  description: string | null;
};

export type RolePermission = {
  id?: string;
  role_id: string;
  permission_id: string;
  permissions?: Permission | null;
};

export type RoleWithPermissions = {
  role: Role;
  permissions: Permission[];
};

/* =========================================
   API RESPONSE TYPES
========================================= */

type ApiResponse<T = unknown> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

/* =========================================
   HELPER
========================================= */

function getToken(): string {
  const token = localStorage.getItem(
    "auth_token"
  );

  if (!token) {
    throw new Error(
      "Session admin tidak ditemukan. Silakan login kembali."
    );
  }

  return token;
}

/* =========================================
   REQUEST
========================================= */

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/roles${path}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    }
  );

  let result: ApiResponse | null = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ??
        result?.error ??
        `Request gagal (${response.status})`
    );
  }

  /*
   * Backend:
   *
   * {
   *   success: true,
   *   data: ...
   * }
   *
   * Jika ada data, kembalikan data.
   */
  if (
    result &&
    Object.prototype.hasOwnProperty.call(
      result,
      "data"
    )
  ) {
    return result.data as T;
  }

  /*
   * Fallback jika backend langsung
   * mengembalikan object / array.
   */
  return result as T;
}

/* =========================================
   NORMALIZE ARRAY
========================================= */

function normalizeArray<T>(
  value: unknown,
  possibleKeys: string[] = []
): T[] {
  /*
   * Sudah array
   */
  if (Array.isArray(value)) {
    return value as T[];
  }

  /*
   * Cari property seperti:
   *
   * roles
   * permissions
   * data
   * items
   */
  if (
    value &&
    typeof value === "object"
  ) {
    const objectValue =
      value as Record<string, unknown>;

    for (const key of possibleKeys) {
      const nested =
        objectValue[key];

      if (Array.isArray(nested)) {
        return nested as T[];
      }
    }
  }

  /*
   * Jangan biarkan component menerima
   * object ketika membutuhkan array.
   */
  return [];
}

/* =========================================
   GET ALL ROLES
========================================= */

export async function getRoles(): Promise<Role[]> {
  const result =
    await request<unknown>("");

  return normalizeArray<Role>(
    result,
    [
      "roles",
      "data",
      "items",
    ]
  );
}

/* =========================================
   GET ALL PERMISSIONS
========================================= */

export async function getPermissions(): Promise<
  Permission[]
> {
  const result =
    await request<unknown>(
      "/permissions"
    );

  return normalizeArray<Permission>(
    result,
    [
      "permissions",
      "data",
      "items",
    ]
  );
}

/* =========================================
   GET PERMISSIONS BY ROLE
========================================= */

export async function getRolePermissions(
  roleId: string
): Promise<RoleWithPermissions> {
  const result =
    await request<unknown>(
      `/${roleId}/permissions`
    );

  /*
   * Format yang diharapkan:
   *
   * {
   *   role: {...},
   *   permissions: [...]
   * }
   */

  if (
    result &&
    typeof result === "object"
  ) {
    const objectResult =
      result as Record<
        string,
        unknown
      >;

    const role =
      objectResult.role as Role;

    const permissions =
      normalizeArray<Permission>(
        objectResult.permissions,
        [
          "permissions",
          "data",
          "items",
        ]
      );

    return {
      role,
      permissions,
    };
  }

  throw new Error(
    "Format response role permissions tidak valid."
  );
}

/* =========================================
   UPDATE ROLE PERMISSIONS
========================================= */

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<RoleWithPermissions> {
  const result =
    await request<unknown>(
      `/${roleId}/permissions`,
      {
        method: "PUT",

        body: JSON.stringify({
          permissionIds,
        }),
      }
    );

  if (
    result &&
    typeof result === "object"
  ) {
    const objectResult =
      result as Record<
        string,
        unknown
      >;

    const role =
      objectResult.role as Role;

    const permissions =
      normalizeArray<Permission>(
        objectResult.permissions,
        [
          "permissions",
          "data",
          "items",
        ]
      );

    return {
      role,
      permissions,
    };
  }

  throw new Error(
    "Format response update role permissions tidak valid."
  );
}

/* =========================================
   CREATE ROLE
========================================= */

export async function createRole(
  data: {
    name: string;
    description?: string;
  }
): Promise<Role> {
  const result =
    await request<unknown>("", {
      method: "POST",

      body: JSON.stringify(data),
    });

  /*
   * Kemungkinan response:
   *
   * {
   *   id: "...",
   *   name: "Admin"
   * }
   *
   * atau:
   *
   * {
   *   role: {...}
   * }
   */

  if (
    result &&
    typeof result === "object"
  ) {
    const objectResult =
      result as Record<
        string,
        unknown
      >;

    if (
      objectResult.role &&
      typeof objectResult.role ===
        "object"
    ) {
      return objectResult.role as Role;
    }

    return objectResult as Role;
  }

  throw new Error(
    "Format response create role tidak valid."
  );
}

/* =========================================
   UPDATE ROLE
========================================= */

export async function updateRole(
  roleId: string,
  data: {
    name: string;
    description?: string;
  }
): Promise<Role> {
  const result =
    await request<unknown>(
      `/${roleId}`,
      {
        method: "PUT",

        body: JSON.stringify(data),
      }
    );

  if (
    result &&
    typeof result === "object"
  ) {
    const objectResult =
      result as Record<
        string,
        unknown
      >;

    if (
      objectResult.role &&
      typeof objectResult.role ===
        "object"
    ) {
      return objectResult.role as Role;
    }

    return objectResult as Role;
  }

  throw new Error(
    "Format response update role tidak valid."
  );
}

/* =========================================
   DELETE ROLE
========================================= */

export async function deleteRole(
  roleId: string
): Promise<void> {
  await request<unknown>(
    `/${roleId}`,
    {
      method: "DELETE",
    }
  );
}
