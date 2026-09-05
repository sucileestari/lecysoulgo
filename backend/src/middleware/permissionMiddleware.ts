import type {
  NextFunction,
  Request,
  Response,
} from "express";

/* =========================================
   REQUIRE PERMISSION
========================================= */

export function requirePermission(
  permission: string,
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    /*
     * authenticate middleware harus
     * dijalankan terlebih dahulu.
     */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "Authentication diperlukan.",
      });
    }

    /*
     * Normalisasi role.
     *
     * Contoh:
     * "Super Admin" -> "super_admin"
     * "super_admin" -> "super_admin"
     */

    const normalizedRole = req.user.role
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    /*
     * Super Admin mempunyai akses penuh.
     */

    if (normalizedRole === "super_admin") {
      return next();
    }

    /*
     * Cek permission user.
     */

    const permissions =
      req.user.permissions ?? [];

    if (
      !permissions.includes(permission)
    ) {
      return res.status(403).json({
        success: false,
        code: "PERMISSION_DENIED",
        message:
          "Kamu tidak memiliki permission untuk melakukan aksi ini.",
      });
    }

    return next();
  };
}