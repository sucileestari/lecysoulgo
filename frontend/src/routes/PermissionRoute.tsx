import {
  Navigate,
  useLocation,
} from "react-router-dom";

/* =========================================
   TYPES
========================================= */

type PermissionRouteProps = {
  children: React.ReactNode;

  /*
   * Dipertahankan untuk kompatibilitas
   * dengan AppRoutes yang masih mengirim
   * permission="...".
   *
   * Permission TIDAK digunakan sebagai
   * route access control.
   *
   * Permission UI ditangani oleh:
   * - AdminLayout
   * - page/action menggunakan
   *   canAccessPermission()
   */
  permission?: string;
};

/* =========================================
   PERMISSION ROUTE
========================================= */

export default function PermissionRoute({
  children,
}: PermissionRouteProps) {
  const location = useLocation();

  /* =========================================
     CHECK CUSTOMER SESSION
  ========================================= */

  const customerToken =
    localStorage.getItem(
      "customer_token",
    );

  /*
   * Customer tidak boleh masuk
   * ke halaman admin yang menggunakan
   * PermissionRoute.
   *
   * Customer tetap diarahkan ke
   * Rules GO seperti behavior sebelumnya.
   */
  if (customerToken) {
    return (
      <Navigate
        to="/rules-go"
        replace
      />
    );
  }

  /* =========================================
     CHECK ADMIN SESSION
  ========================================= */

  const adminToken =
    localStorage.getItem(
      "auth_token",
    );

  /*
   * Tidak ada admin session.
   *
   * ProtectedRoute biasanya juga
   * menangani kondisi ini, tetapi
   * pengecekan di sini membuat component
   * tetap aman jika digunakan sendiri.
   */
  if (!adminToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  /* =========================================
     AUTHORIZED
  ========================================= */

  /*
   * Permission tidak dicek di level route.
   *
   * Aturan permission aplikasi:
   *
   * - permission tidak ada
   *   → UI tampil
   *
   * - permission tidak terdaftar di DB
   *   → UI tampil
   *
   * - permission terdaftar + user punya
   *   → UI tampil
   *
   * - permission terdaftar + user tidak punya
   *   → UI disembunyikan
   *
   * Route tetap dapat diakses setelah
   * authentication berhasil.
   */

  return <>{children}</>;
}