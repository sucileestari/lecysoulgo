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
import IjinTelatBayarPage from "../pages/IjinTelatBayarPage";
import PengirimanManualPage from "../pages/PengirimanManualPage";
import ModalDanKeuntunganPage from "../pages/ModalDanKeuntunganPage";
import ArusDanaPage from "../pages/ArusDanaPage";
import GajiKaryawanPage from "../pages/GajiKaryawanPage";
import RekapanSaya from "../pages/RekapanSayaPage";
import RolesPermissionPage from "../pages/RolesPermissionPage";

import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";

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
              RULES GO

              Bisa diakses oleh:
              - Admin
              - Super Admin
              - Customer

              Tidak menggunakan PermissionRoute
              karena Customer juga harus bisa melihat
              Rules GO.
          ========================================= */}

          <Route
            path="/rules-go"
            element={<RulesGoPage />}
          />

          {/* =========================================
              MEMBERS

              Admin permission:
              members.view
          ========================================= */}

          <Route
            path="/members"
            element={
              <PermissionRoute permission="members.view">
                <MembersPage />
              </PermissionRoute>
            }
          />

          {/* =========================================
              REKAPAN - CHINA

              Permission:
              recaps.view
          ========================================= */}

          <Route
            path="/rekapan/china"
            element={
              <PermissionRoute permission="recaps.view">
                <RekapPage country="china" />
              </PermissionRoute>
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
              <PermissionRoute permission="recaps.view">
                <RekapPage country="indonesia" />
              </PermissionRoute>
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
              <PermissionRoute permission="recaps.view">
                <RekapPage country="jepang" />
              </PermissionRoute>
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
              <PermissionRoute permission="recaps.view">
                <RekapPage country="korea" />
              </PermissionRoute>
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
              <PermissionRoute permission="recaps.view">
                <RekapPage country="thailand" />
              </PermissionRoute>
            }
          />

          {/* =========================================
              IJIN TELAT BAYAR

              Admin permission:
              late_payment_permissions.view
          ========================================= */}

          <Route
            path="/ijin-telat-bayar"
            element={
              <PermissionRoute
                permission="late_payment_permissions.view"
              >
                <IjinTelatBayarPage />
              </PermissionRoute>
            }
          />

          {/* =========================================
              PENGIRIMAN MANUAL

              Admin permission:
              shipping.view
          ========================================= */}

          <Route
            path="/pengiriman-manual"
            element={
              <PermissionRoute permission="shipping.view">
                <PengirimanManualPage />
              </PermissionRoute>
            }
          />

          {/* =========================================
              MODAL DAN KEUNTUNGAN
          ========================================= */}

          <Route
            path="/modal-dan-keuntungan"
            element={<ModalDanKeuntunganPage />}
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
            element={
              <PermissionRoute permission="roles.view">
                <RolesPermissionPage />
              </PermissionRoute>
            }
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