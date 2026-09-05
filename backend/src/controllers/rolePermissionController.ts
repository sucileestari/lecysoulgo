import type {
  Request,
  Response,
} from "express";

import {
  getAllRoles,
  getAllPermissions,
  getRoleWithPermissions,
  updateRolePermissions,
  createRole,
  updateRole,
  deleteRole,
} from "../services/rolePermissionService.js";

/* =========================================
   GET ROLES
   GET /api/roles
========================================= */

export async function getRolesHandler(
  _req: Request,
  res: Response,
) {
  try {
    const roles =
      await getAllRoles();

    return res.status(200).json({
      success: true,

      data: {
        roles,
      },
    });
  } catch (error) {
    console.error(
      "getRolesHandler:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Gagal mengambil data role.",
    });
  }
}

/* =========================================
   GET PERMISSIONS
   GET /api/permissions
========================================= */

export async function getPermissionsHandler(
  _req: Request,
  res: Response,
) {
  try {
    const permissions =
      await getAllPermissions();

    return res.status(200).json({
      success: true,

      data: {
        permissions,
      },
    });
  } catch (error) {
    console.error(
      "getPermissionsHandler:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Gagal mengambil data permission.",
    });
  }
}

/* =========================================
   GET ROLE PERMISSIONS
   GET /api/roles/:roleId/permissions
========================================= */

export async function getRolePermissionsHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      roleId,
    } = req.params;

    /*
     * Pastikan roleId benar-benar string.
     *
     * req.params.roleId dapat terbaca sebagai
     * string | string[] oleh TypeScript.
     */
    if (
      typeof roleId !== "string" ||
      !roleId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Role ID wajib diisi.",
      });
    }

    const result =
      await getRoleWithPermissions(
        roleId,
      );

    return res.status(200).json({
      success: true,

      data: result,
    });
  } catch (error) {
    console.error(
      "getRolePermissionsHandler:",
      error,
    );

    const code =
      (
        error as {
          code?: string;
        }
      ).code;

    if (
      code ===
      "ROLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        code,
        message:
          "Role tidak ditemukan.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Gagal mengambil permission role.",
    });
  }
}

/* =========================================
   UPDATE ROLE PERMISSIONS
   PUT /api/roles/:roleId/permissions
========================================= */

export async function updateRolePermissionsHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      roleId,
    } = req.params;

    const {
      permissionIds,
    } = req.body;

    /*
     * Pastikan roleId benar-benar string.
     */
    if (
      typeof roleId !== "string" ||
      !roleId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Role ID wajib diisi.",
      });
    }

    if (
      !Array.isArray(
        permissionIds,
      )
    ) {
      return res.status(400).json({
        success: false,
        code:
          "INVALID_PERMISSION_IDS",
        message:
          "permissionIds harus berupa array.",
      });
    }

    if (
      !permissionIds.every(
        (id: unknown) =>
          typeof id ===
          "string",
      )
    ) {
      return res.status(400).json({
        success: false,
        code:
          "INVALID_PERMISSION_IDS",
        message:
          "Semua permission ID harus berupa string.",
      });
    }

    /*
     * Super Admin tidak boleh diubah.
     */
    if (
      roleId ===
      "super_admin"
    ) {
      return res.status(403).json({
        success: false,
        code:
          "SUPER_ADMIN_PROTECTED",
        message:
          "Permission Super Admin tidak dapat diubah.",
      });
    }

    const result =
      await updateRolePermissions(
        roleId,
        permissionIds,
      );

    return res.status(200).json({
      success: true,

      message:
        "Permission role berhasil diperbarui.",

      data: result,
    });
  } catch (error) {
    console.error(
      "updateRolePermissionsHandler:",
      error,
    );

    const code =
      (
        error as {
          code?: string;
        }
      ).code;

    if (
      code ===
      "ROLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        code,
        message:
          "Role tidak ditemukan.",
      });
    }

    if (
      code ===
      "INVALID_PERMISSION_IDS"
    ) {
      return res.status(400).json({
        success: false,
        code,
        message:
          (
            error as Error
          ).message,
      });
    }

    if (
      code ===
      "SUPER_ADMIN_PROTECTED"
    ) {
      return res.status(403).json({
        success: false,
        code,
        message:
          "Permission Super Admin tidak dapat diubah.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Gagal memperbarui permission role.",
    });
  }
}

/* =========================================
   CREATE ROLE
   POST /api/roles
========================================= */

export async function createRoleHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      name,
      description,
    } = req.body;

    if (
      typeof name !==
      "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nama role wajib diisi.",
      });
    }

    const role =
      await createRole(
        name,
        typeof description ===
          "string"
          ? description
          : undefined,
      );

    return res.status(201).json({
      success: true,

      message:
        "Role berhasil dibuat.",

      data: {
        role,
      },
    });
  } catch (error) {
    console.error(
      "createRoleHandler:",
      error,
    );

    const code =
      (
        error as {
          code?: string;
        }
      ).code;

    if (
      code ===
      "ROLE_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        code,
        message:
          "Role dengan nama tersebut sudah ada.",
      });
    }

    if (
      code ===
      "ROLE_NAME_REQUIRED"
    ) {
      return res.status(400).json({
        success: false,
        code,
        message:
          "Nama role wajib diisi.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Gagal membuat role.",
    });
  }
}

/* =========================================
   UPDATE ROLE
   PUT /api/roles/:roleId
========================================= */

export async function updateRoleHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      roleId,
    } = req.params;

    const {
      name,
      description,
    } = req.body;

    /*
     * Pastikan roleId benar-benar string.
     */
    if (
      typeof roleId !== "string" ||
      !roleId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Role ID wajib diisi.",
      });
    }

    if (
      typeof name !==
      "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nama role wajib diisi.",
      });
    }

    const role =
      await updateRole(
        roleId,
        name,
        typeof description ===
          "string"
          ? description
          : undefined,
      );

    return res.status(200).json({
      success: true,

      message:
        "Role berhasil diperbarui.",

      data: {
        role,
      },
    });
  } catch (error) {
    console.error(
      "updateRoleHandler:",
      error,
    );

    const code =
      (
        error as {
          code?: string;
        }
      ).code;

    if (
      code ===
      "ROLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        code,
        message:
          "Role tidak ditemukan.",
      });
    }

    if (
      code ===
      "SUPER_ADMIN_PROTECTED"
    ) {
      return res.status(403).json({
        success: false,
        code,
        message:
          "Role Super Admin tidak dapat diubah.",
      });
    }

    if (
      code ===
      "ROLE_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        code,
        message:
          "Role dengan nama tersebut sudah ada.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Gagal memperbarui role.",
    });
  }
}

/* =========================================
   DELETE ROLE
   DELETE /api/roles/:roleId
========================================= */

export async function deleteRoleHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      roleId,
    } = req.params;

    /*
     * Pastikan roleId benar-benar string.
     */
    if (
      typeof roleId !== "string" ||
      !roleId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Role ID wajib diisi.",
      });
    }

    const result =
      await deleteRole(
        roleId,
      );

    return res.status(200).json({
      success: true,

      message:
        "Role berhasil dihapus.",

      data: result,
    });
  } catch (error) {
    console.error(
      "deleteRoleHandler:",
      error,
    );

    const code =
      (
        error as {
          code?: string;
        }
      ).code;

    if (
      code ===
      "ROLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        code,
        message:
          "Role tidak ditemukan.",
      });
    }

    if (
      code ===
      "SUPER_ADMIN_PROTECTED"
    ) {
      return res.status(403).json({
        success: false,
        code,
        message:
          "Role Super Admin tidak dapat dihapus.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Gagal menghapus role.",
    });
  }
}