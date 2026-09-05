import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

import {
  hasPermission,
} from "../utils/permissions";

/* =========================================
   TYPES
========================================= */

type PermissionRouteProps = {
  children: React.ReactNode;
  permission: string;
};

/* =========================================
   PERMISSION ROUTE
========================================= */

export default function PermissionRoute({
  children,
  permission,
}: PermissionRouteProps) {
  const location =
    useLocation();

  /* =========================================
     CHECK CUSTOMER SESSION
  ========================================= */

  const customerToken =
    localStorage.getItem(
      "customer_token",
    );

  /*
   * Customer tidak boleh masuk
   * ke halaman admin permission.
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
   * ProtectedRoute sebenarnya sudah
   * menangani kondisi ini, tetapi
   * pengecekan ini membuat component
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
     CHECK PERMISSION
  ========================================= */

  const allowed =
    hasPermission(
      permission,
    );

  if (!allowed) {
    return (
      <PermissionDenied />
    );
  }

  /* =========================================
     AUTHORIZED
  ========================================= */

  return <>{children}</>;
}

/* =========================================
   PERMISSION DENIED
========================================= */

function PermissionDenied() {
  function handleBack() {
    window.history.back();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faff] p-6">

      <div className="w-full max-w-md rounded-2xl border border-[#e3e9f4] bg-white p-8 text-center shadow-sm">

        {/* ICON */}

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f2]">

          <ShieldAlert className="h-8 w-8 text-[#ef5368]" />

        </div>

        {/* TITLE */}

        <h1 className="mt-5 text-xl font-bold text-[#142968]">
          Akses Ditolak
        </h1>

        {/* DESCRIPTION */}

        <p className="mt-2 text-sm leading-6 text-[#7181a7]">
          Kamu tidak memiliki permission
          untuk mengakses halaman ini.
        </p>

        {/* BUTTON */}

        <button
          type="button"
          onClick={
            handleBack
          }
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1457ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f49d8]"
        >
          <ArrowLeft className="h-4 w-4" />

          Kembali
        </button>

      </div>

    </div>
  );
}