import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

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
            setIsAuthenticated(false);
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
            if (!cancelled) {
              setIsAuthenticated(true);
              setIsChecking(false);
            }

            return;
          }

          /*
           * Admin token tidak valid.
           */
          localStorage.removeItem(
            "auth_token",
          );

          localStorage.removeItem(
            "auth_user",
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
              setIsAuthenticated(true);
              setIsChecking(false);
            }

            return;
          }

          /*
           * Customer token tidak valid.
           */
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
          setIsAuthenticated(false);
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
         * Bisa saja backend sedang
         * sementara tidak dapat diakses.
         */

        if (!cancelled) {
          setIsAuthenticated(false);
          setIsChecking(false);
        }
      }
    }

    validateSession();

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