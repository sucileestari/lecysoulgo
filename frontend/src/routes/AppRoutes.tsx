import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";

import LoginPage from "../pages/LoginPage";

import MembersPage from "../pages/MembersPage";
import RekapPage from "../pages/RekapPage";
import RulesGoPage from "../pages/RulesGoPage";
import NotificationLogPage from "../pages/NotificationLogPage";
import IjinTelatBayarPage from "../pages/IjinTelatBayarPage";
import PengirimanManualPage from "../pages/PengirimanManualPage";
import ModalDanKeuntunganPage from "../pages/ModalDanKeuntunganPage";
import ArusDanaPage from "../pages/ArusDanaPage";
import GajiKaryawanPage from "../pages/GajiKaryawanPage";
import RekapanSaya from "../pages/RekapanSayaPage";
import RolesPermissionPage from "../pages/RolesPermissionPage";
import PesananMarketplacePage from "../pages/PesananMarketplacePage";

import ProtectedRoute from "./ProtectedRoute";

/* =========================================
   RULES GO ACCESS
========================================= */

function RulesGoAccessLayout() {
  const hasAdminSession = Boolean(
    localStorage.getItem(
      "auth_token",
    ),
  );

  const hasCustomerSession = Boolean(
    localStorage.getItem(
      "customer_token",
    ),
  );

  const isRulesOnlyCustomer =
    localStorage.getItem(
      "customer_rules_only",
    ) === "true";

  /*
   * Rules GO boleh dibuka oleh:
   * - Admin / Super Admin
   * - Customer normal
   * - Customer tanpa member / rekapan
   */
  if (
    !hasAdminSession &&
    !hasCustomerSession &&
    !isRulesOnlyCustomer
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <AdminLayout />;
}

/* =========================================
   APP ROUTES
========================================= */

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================================
            LOGIN
        ========================================= */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* =========================================
            RULES GO

            Bisa diakses oleh:
            - Admin
            - Super Admin
            - Customer normal
            - Customer tanpa member / rekapan

            Customer tanpa member hanya akan
            melihat menu Rules GO dari AdminLayout.
        ========================================= */}

        <Route
          element={
            <RulesGoAccessLayout />
          }
        >
          <Route
            path="/rules-go"
            element={<RulesGoPage />}
          />
        </Route>

        {/* =========================================
            PROTECTED APPLICATION AREA

            Digunakan oleh:
            - Admin
            - Super Admin
            - Customer
        ========================================= */}

        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >

          {/* =========================================
              MEMBERS

              Admin permission:
              members.view
          ========================================= */}

          <Route
            path="/members"
            element={<MembersPage />}
          />

          {/* =========================================
              NOTIFICATION LOG
          ========================================= */}

          <Route
            path="/notification-log"
            element={<NotificationLogPage />}
          />

          {/* =========================================
              REKAPAN - CHINA

              Permission:
              recaps.view
          ========================================= */}

          <Route
            path="/rekapan/china"
            element={
              <RekapPage
                country="china"
              />
            }
          />

          {/* =========================================
              REKAPAN - INDONESIA

              Permission:
              recaps.view
          ========================================= */}

          <Route
            path="/rekapan/indonesia"
            element={
              <RekapPage
                country="indonesia"
              />
            }
          />

          {/* =========================================
              REKAPAN - JEPANG

              Permission:
              recaps.view
          ========================================= */}

          <Route
            path="/rekapan/jepang"
            element={
              <RekapPage
                country="jepang"
              />
            }
          />

          {/* =========================================
              REKAPAN - KOREA

              Permission:
              recaps.view
          ========================================= */}

          <Route
            path="/rekapan/korea"
            element={
              <RekapPage
                country="korea"
              />
            }
          />

          {/* =========================================
              REKAPAN - THAILAND

              Permission:
              recaps.view
          ========================================= */}

          <Route
            path="/rekapan/thailand"
            element={
              <RekapPage
                country="thailand"
              />
            }
          />

          {/* =========================================
              IJIN TELAT BAYAR

              Admin permission:
              late_payment_permissions.view
          ========================================= */}

          <Route
            path="/ijin-telat-bayar"
            element={<IjinTelatBayarPage />}
          />

          {/* =========================================
              PENGIRIMAN MANUAL

              Permission:
              shipping.view

              Permission is handled by AdminLayout
              for menu visibility only.
          ========================================= */}

          <Route
            path="/pengiriman-manual"
            element={<PengirimanManualPage />}
          />

          {/* =========================================
              PESANAN MARKETPLACE

              Bisa diakses oleh:
              - Admin
              - Super Admin
              - Role lain yang masuk aplikasi

              Tidak menggunakan permission admin.
          ========================================= */}

          <Route
            path="/pesanan-marketplace"
            element={
              <PesananMarketplacePage />
            }
          />

          {/* =========================================
              MODAL DAN KEUNTUNGAN
          ========================================= */}

          <Route
            path="/modal-dan-keuntungan"
            element={
              <ModalDanKeuntunganPage />
            }
          />

          {/* =========================================
              ARUS DANA / KEUANGAN
          ========================================= */}

          <Route
            path="/arus-dana"
            element={<ArusDanaPage />}
          />

          {/* =========================================
              GAJI KARYAWAN
          ========================================= */}

          <Route
            path="/gaji-karyawan"
            element={<GajiKaryawanPage />}
          />

          {/* =========================================
              ROLE & PERMISSION

              Permission:
              roles.view

              Super Admin:
              otomatis boleh akses

              Admin:
              harus mempunyai roles.view
          ========================================= */}

          <Route
            path="/roles-permissions"
            element={<RolesPermissionPage />}
          />

          {/* =========================================
              CUSTOMER - REKAPAN SAYA

              Tidak menggunakan permission admin
          ========================================= */}

          <Route
            path="/customer/rekapan"
            element={<RekapanSaya />}
          />

          {/* =========================================
              CUSTOMER - IJIN TELAT BAYAR

              Tidak menggunakan permission admin
          ========================================= */}

          <Route
            path="/customer/ijin-telat-bayar"
            element={<IjinTelatBayarPage />}
          />

          {/* =========================================
              CUSTOMER - PENGIRIMAN MANUAL

              Tidak menggunakan permission admin

              Customer mode:
              isCustomer = true
          ========================================= */}

          <Route
            path="/customer/pengiriman-manual"
            element={
              <PengirimanManualPage
                isCustomer
              />
            }
          />

          {/* =========================================
              CUSTOMER - PESANAN MARKETPLACE

              Tidak menggunakan permission admin
          ========================================= */}

          <Route
            path="/customer/pesanan-marketplace"
            element={
              <PesananMarketplacePage />
            }
          />

        </Route>

        {/* =========================================
            FALLBACK
        ========================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}
