import type { FormEvent } from "react";
import { useState } from "react";

import {
  Eye,
  EyeOff,
  Lock,
  Phone,
  User,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import { getPermissions } from "../services/rolePermissionService";

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
   LOGIN PAGE
========================================= */

export default function LoginPage() {
  const navigate =
    useNavigate();

  /* =========================================
     LOGIN MODE
  ========================================= */

  const [
    loginMode,
    setLoginMode,
  ] = useState<
    "admin" | "customer"
  >("admin");

  /* =========================================
     ADMIN FORM
  ========================================= */

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  /* =========================================
     CUSTOMER FORM
  ========================================= */

  const [
    phone,
    setPhone,
  ] = useState("");

  /* =========================================
     GENERAL STATE
  ========================================= */

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =========================================
     SWITCH TO CUSTOMER
  ========================================= */

  function handleSwitchToCustomer() {
    setLoginMode("customer");

    setErrorMessage("");

    setPhone("");
  }

  /* =========================================
     SWITCH TO ADMIN
  ========================================= */

  function handleSwitchToAdmin() {
    setLoginMode("admin");

    setErrorMessage("");

    setPhone("");
  }

  /* =========================================
     ADMIN LOGIN
  ========================================= */

  async function handleAdminLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");

    /* -------------------------------------
       VALIDATION
    ------------------------------------- */

    const cleanUsername =
      username.trim();

    if (!cleanUsername) {
      setErrorMessage(
        "Username wajib diisi.",
      );

      return;
    }

    if (!password) {
      setErrorMessage(
        "Password wajib diisi.",
      );

      return;
    }

    try {
      setIsLoading(true);

      /* -------------------------------------
         API REQUEST
      ------------------------------------- */

      const response =
        await fetch(
          buildApiUrl(
            "/auth/login",
          ),
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              username:
                cleanUsername,

              password,
            }),
          },
        );

      const result =
        await response.json();

      /* -------------------------------------
         HANDLE ERROR
      ------------------------------------- */

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Login gagal.",
        );
      }

      /* -------------------------------------
         GET RESPONSE DATA
      ------------------------------------- */

      const token =
        result?.data?.token;

      const user =
        result?.data?.user;

      if (!token) {
        throw new Error(
          "Token login tidak ditemukan.",
        );
      }

      /* -------------------------------------
         CLEAR CUSTOMER SESSION
      ------------------------------------- */

      localStorage.removeItem(
        "customer_token",
      );

      localStorage.removeItem(
        "customer_member",
      );

      localStorage.removeItem(
        "customer_rules_only",
      );

      /* -------------------------------------
         SAVE ADMIN SESSION
      ------------------------------------- */

      localStorage.setItem(
        "auth_token",
        token,
      );

      localStorage.setItem(
        "auth_user",
        JSON.stringify(
          user ?? {},
        ),
      );

      /* -------------------------------------
         LOAD REGISTERED PERMISSIONS
      ------------------------------------- */

      try {
        const permissions =
          await getPermissions();

        const registeredPermissionCodes =
          permissions
            .map(
              (permission) =>
                String(
                  (
                    permission as {
                      code?: string;
                    }
                  ).code ?? "",
                )
                  .trim()
                  .toLowerCase(),
            )
            .filter(Boolean);

        localStorage.setItem(
          "auth_registered_permissions",
          JSON.stringify(
            registeredPermissionCodes,
          ),
        );
      } catch (permissionError) {
        console.error(
          "Load registered permissions error:",
          permissionError,
        );

        localStorage.removeItem(
          "auth_token",
        );

        localStorage.removeItem(
          "auth_user",
        );

        localStorage.removeItem(
          "auth_registered_permissions",
        );

        throw new Error(
          "Gagal memuat permission admin.",
        );
      }

      /* -------------------------------------
         REDIRECT ADMIN
      ------------------------------------- */

      navigate(
        "/rules-go",
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Admin login error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login gagal. Silakan coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* =========================================
     CUSTOMER ACCESS
  ========================================= */

  async function handleCustomerLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");

    /* -------------------------------------
       CLEAN PHONE
    ------------------------------------- */

    const cleanPhone =
      phone.trim();

    /* -------------------------------------
       VALIDATION
    ------------------------------------- */

    if (!cleanPhone) {
      setErrorMessage(
        "Nomor WhatsApp wajib diisi.",
      );

      return;
    }

    try {
      setIsLoading(true);

      /* -------------------------------------
         API REQUEST
      ------------------------------------- */

      const response =
        await fetch(
          buildApiUrl(
            "/customer/access",
          ),
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              phone: cleanPhone,
            }),
          },
        );

      const result =
        await response.json();

      /* =====================================
         CUSTOMER BELUM TERDAFTAR
      ===================================== */

      if (
        response.status === 404 &&
        result?.code ===
          "MEMBER_NOT_FOUND"
      ) {
        /*
         * Customer bukan member.
         *
         * Tidak membuat customer session,
         * tetapi tetap membuat session marker
         * khusus agar customer dapat masuk ke web
         * dan hanya melihat Rules GO.
         */

        localStorage.removeItem(
          "customer_token",
        );

        localStorage.removeItem(
          "customer_member",
        );

        localStorage.removeItem(
          "auth_token",
        );

        localStorage.removeItem(
          "auth_user",
        );

        localStorage.removeItem(
          "auth_registered_permissions",
        );

        localStorage.setItem(
          "customer_rules_only",
          "true",
        );

        navigate(
          "/rules-go",
          {
            replace: true,
          },
        );

        return;
      }

      /* =====================================
         HANDLE OTHER ERROR
      ===================================== */

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Gagal memverifikasi customer.",
        );
      }

      /* =====================================
         GET CUSTOMER DATA
      ===================================== */

      const token =
        result?.data?.token;

      const member =
        result?.data?.member;

      if (!token) {
        throw new Error(
          "Token customer tidak ditemukan.",
        );
      }

      /* =====================================
         CLEAR ADMIN SESSION
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

      /* =====================================
         SAVE CUSTOMER SESSION
      ===================================== */

      localStorage.setItem(
        "customer_token",
        token,
      );

      localStorage.setItem(
        "customer_member",
        JSON.stringify(
          member ?? {},
        ),
      );

      localStorage.removeItem(
        "customer_rules_only",
      );

      /* =====================================
         REDIRECT CUSTOMER
      ===================================== */

      navigate(
        "/rules-go",
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Customer access error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal memverifikasi customer. Silakan coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* =================================
              BRAND
          ================================== */}

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white">
              GO
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Selamat Datang
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Silakan masuk untuk
              melanjutkan
            </p>
          </div>

          {/* =================================
              LOGIN CARD
          ================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            {/* =================================
                ADMIN LOGIN
            ================================== */}

            {loginMode ===
              "admin" && (
              <form
                onSubmit={
                  handleAdminLogin
                }
                className="space-y-5"
              >

                {/* USERNAME */}

                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Username
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="username"
                      type="text"
                      value={
                        username
                      }
                      onChange={(
                        event,
                      ) =>
                        setUsername(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Masukkan username"
                      autoComplete="username"
                      disabled={
                        isLoading
                      }
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* PASSWORD */}

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        event,
                      ) =>
                        setPassword(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      disabled={
                        isLoading
                      }
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-11 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value,
                        )
                      }
                      disabled={
                        isLoading
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff
                          size={18}
                        />
                      ) : (
                        <Eye
                          size={18}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR */}

                {errorMessage && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {
                      errorMessage
                    }
                  </div>
                )}

                {/* LOGIN BUTTON */}

                <button
                  type="submit"
                  disabled={
                    isLoading
                  }
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading
                    ? "Memproses..."
                    : "Masuk"}
                </button>

                {/* DIVIDER */}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>

                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-gray-400">
                      atau
                    </span>
                  </div>
                </div>

                {/* CUSTOMER BUTTON */}

                <button
                  type="button"
                  onClick={
                    handleSwitchToCustomer
                  }
                  disabled={
                    isLoading
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Saya Customer
                </button>

                <p className="text-center text-xs text-gray-400">
                  Tidak perlu username
                  &amp; password
                </p>
              </form>
            )}

            {/* =================================
                CUSTOMER LOGIN
            ================================== */}

            {loginMode ===
              "customer" && (
              <form
                onSubmit={
                  handleCustomerLogin
                }
                className="space-y-5"
              >

                {/* HEADER */}

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Masuk sebagai Customer
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    Masukkan nomor WhatsApp
                    yang terdaftar sebagai
                    member.
                  </p>
                </div>

                {/* PHONE */}

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Nomor WhatsApp
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(
                        event,
                      ) =>
                        setPhone(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Contoh: 081234567890"
                      autoComplete="tel"
                      disabled={
                        isLoading
                      }
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* INFORMATION */}

                <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
                  Nomor WhatsApp digunakan
                  untuk memverifikasi data
                  member kamu.
                </div>

                {/* ERROR */}

                {errorMessage && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {
                      errorMessage
                    }
                  </div>
                )}

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={
                    isLoading
                  }
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading
                    ? "Memverifikasi..."
                    : "Lanjutkan"}
                </button>

                {/* BACK */}

                <button
                  type="button"
                  onClick={
                    handleSwitchToAdmin
                  }
                  disabled={
                    isLoading
                  }
                  className="w-full py-2 text-sm font-medium text-gray-500 transition hover:text-gray-900 disabled:opacity-60"
                >
                  ← Kembali ke Login
                </button>

              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}