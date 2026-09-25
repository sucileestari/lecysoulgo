import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  getPermissions,
} from "../services/rolePermissionService";

/* =========================================
   API CONFIG
========================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur di environment variables.",
  );
}

function buildApiUrl(
  path: string,
): string {
  return `${API_BASE_URL.replace(
    /\/$/,
    "",
  )}/api${path}`;
}

/* =========================================
   TYPES
========================================= */

type ProtectedRouteProps = {
  children: ReactNode;
};

/* =========================================
   HELPERS
========================================= */

async function syncAdminSession(
  response: Response,
): Promise<void> {
  /*
   * /auth/me mengembalikan:
   *
   * {
   *   user: {
   *     ...,
   *     permissions: string[]
   *   }
   * }
   *
   * Sinkronkan auth_user dari backend
   * supaya permission terbaru dari role
   * ikut tersimpan di localStorage.
   */

  try {
    const data = await response.json();

    if (
      data &&
      typeof data === "object" &&
      "user" in data &&
      data.user &&
      typeof data.user === "object"
    ) {
      localStorage.setItem(
        "auth_user",
        JSON.stringify(data.user),
      );
    }
  } catch (error) {
    /*
     * Jangan membuat session menjadi invalid
     * hanya karena parsing response gagal.
     */
    console.error(
      "Gagal membaca response /auth/me:",
      error,
    );
  }

  /*
   * Refresh seluruh permission yang
   * terdaftar di database.
   *
   * auth_user.permissions
   * = permission yang dimiliki user.
   *
   * auth_registered_permissions
   * = seluruh permission yang terdaftar
   *   di database.
   */
  try {
    const permissions =
      await getPermissions();

    const registeredPermissionCodes =
      Array.isArray(permissions)
        ? permissions
            .map(
              (permission) =>
                String(
                  permission.code ??
                    "",
                )
                  .trim()
                  .toLowerCase(),
            )
            .filter(
              (code) =>
                Boolean(code),
            )
        : [];

    localStorage.setItem(
      "auth_registered_permissions",
      JSON.stringify(
        registeredPermissionCodes,
      ),
    );
  } catch (error) {
    /*
     * Jangan menghapus session hanya karena
     * registry permission gagal di-refresh.
     *
     * auth_registered_permissions lama
     * tetap dipertahankan jika ada.
     */
    console.error(
      "Gagal mengambil registered permissions:",
      error,
    );
  }
}

/* =========================================
   PROTECTED ROUTE
========================================= */

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const location =
    useLocation();

  const [
    isChecking,
    setIsChecking,
  ] = useState(true);

  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      try {
        /* =====================================
           GET TOKENS
        ===================================== */

        const adminToken =
          localStorage.getItem(
            "auth_token",
          );

        const customerToken =
          localStorage.getItem(
            "customer_token",
          );

        /* =====================================
           NO SESSION
        ===================================== */

        if (
          !adminToken &&
          !customerToken
        ) {
          if (!cancelled) {
            setIsAuthenticated(
              false,
            );
            setIsChecking(false);
          }

          return;
        }

        /* =====================================
           ADMIN SESSION
        ===================================== */

        if (adminToken) {
          const response =
            await fetch(
              buildApiUrl(
                "/auth/me",
              ),
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${adminToken}`,
                },
              },
            );

          if (response.ok) {
            /*
             * Sinkronkan user + registry
             * permission dari backend.
             */
            await syncAdminSession(
              response,
            );

            if (!cancelled) {
              setIsAuthenticated(
                true,
              );
              setIsChecking(false);
            }

            return;
          }

          /* =====================================
             ADMIN TOKEN INVALID
          ===================================== */

          localStorage.removeItem(
            "auth_token",
          );

          localStorage.removeItem(
            "auth_user",
          );

          localStorage.removeItem(
            "auth_registered_permissions",
          );
        }

        /* =====================================
           CUSTOMER SESSION
        ===================================== */

        if (customerToken) {
          const response =
            await fetch(
              buildApiUrl(
                "/customer/me",
              ),
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${customerToken}`,
                },
              },
            );

          if (response.ok) {
            if (!cancelled) {
              setIsAuthenticated(
                true,
              );
              setIsChecking(false);
            }

            return;
          }

          /* =====================================
             CUSTOMER TOKEN INVALID
          ===================================== */

          localStorage.removeItem(
            "customer_token",
          );

          localStorage.removeItem(
            "customer_member",
          );
        }

        /* =====================================
           SESSION INVALID
        ===================================== */

        if (!cancelled) {
          setIsAuthenticated(
            false,
          );
          setIsChecking(false);
        }
      } catch (error) {
        console.error(
          "Session validation error:",
          error,
        );

        /*
         * Jangan langsung menghapus token
         * jika terjadi network error.
         *
         * Token tetap disimpan sehingga
         * session tidak dihancurkan hanya
         * karena backend sedang tidak bisa
         * diakses.
         *
         * Namun component tetap dianggap
         * belum dapat divalidasi pada
         * request ini.
         */
        if (!cancelled) {
          setIsAuthenticated(
            false,
          );
          setIsChecking(false);
        }
      }
    }

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================
     CHECKING SESSION
  ========================================= */

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faff]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#1457ff]" />

          <p className="mt-3 text-sm text-gray-500">
            Memeriksa session...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================
     NOT AUTHENTICATED
  ========================================= */

  if (!isAuthenticated) {
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
     AUTHENTICATED
  ========================================= */

  return <>{children}</>;
}