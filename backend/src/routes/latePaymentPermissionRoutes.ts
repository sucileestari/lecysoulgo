import {
  Router,
} from "express";

import {
  getLatePaymentPermissionsHandler,
  getLatePaymentRecapOptionsHandler,
  createLatePaymentPermissionHandler,
  getCustomerLatePaymentPermissionsHandler,
  getCustomerLatePaymentRecapOptionsHandler,
  createCustomerLatePaymentPermissionHandler,
} from "../controllers/latePaymentPermissionController.js";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  authenticateCustomer,
} from "../middleware/customerAuthMiddleware.js";

/* =========================================
   ADMIN ROUTER
========================================= */

const router = Router();

/* =========================================
   ALL ADMIN ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET ALL
========================================= */

/**
 * GET /api/late-payment-permissions
 *
 * Mengambil seluruh data ijin telat bayar.
 *
 * Status ijin:
 *
 * - unpaid
 * - paid
 *
 * Status paid diperbarui otomatis
 * berdasarkan payment yang terkait.
 *
 * Tidak menggunakan requirePermission()
 * karena late_payment_permissions.view
 * belum terdaftar sebagai permission DB.
 */
router.get(
  "/",
  getLatePaymentPermissionsHandler,
);

/* =========================================
   GET RECAP OPTIONS
========================================= */

/**
 * GET /api/late-payment-permissions/recap-options
 *
 * Mengambil:
 *
 * - semua member
 * - barang yang memenuhi syarat
 * untuk pengajuan ijin telat bayar.
 *
 * Tidak menggunakan requirePermission()
 * karena late_payment_permissions.view
 * belum terdaftar sebagai permission DB.
 */
router.get(
  "/recap-options",
  getLatePaymentRecapOptionsHandler,
);

/* =========================================
   CREATE
========================================= */

/**
 * POST /api/late-payment-permissions
 *
 * Membuat pengajuan ijin telat bayar.
 *
 * Satu member hanya boleh mempunyai
 * satu ijin dengan status unpaid.
 *
 * Tidak menggunakan requirePermission()
 * karena belum ada permission
 * late_payment_permissions.create
 * yang terdaftar di DB.
 *
 * Endpoint tetap membutuhkan login
 * melalui router.use(authenticate).
 */
router.post(
  "/",
  createLatePaymentPermissionHandler,
);

/* =========================================
   CUSTOMER ROUTER
========================================= */

export const customerLatePaymentPermissionRoutes =
  Router();

/* =========================================
   ALL CUSTOMER ROUTES REQUIRE
   CUSTOMER LOGIN
========================================= */

customerLatePaymentPermissionRoutes.use(
  authenticateCustomer,
);

/* =========================================
   CUSTOMER - GET OWN PERMISSIONS
========================================= */

/**
 * GET /api/customer/late-payment-permissions
 *
 * Hanya mengambil ijin telat bayar
 * milik customer yang sedang login.
 *
 * Member ID tidak berasal dari query/body.
 * Member ID diambil dari JWT customer.
 */
customerLatePaymentPermissionRoutes.get(
  "/late-payment-permissions",
  getCustomerLatePaymentPermissionsHandler,
);

/* =========================================
   CUSTOMER - GET RECAP OPTIONS
========================================= */

/**
 * GET /api/customer/late-payment-permissions/recap-options
 *
 * Hanya mengambil:
 *
 * - data member customer yang sedang login
 * - barang/rekapan yang terkait
 *   dengan customer tersebut
 *
 * Member ID diambil dari JWT customer.
 */
customerLatePaymentPermissionRoutes.get(
  "/late-payment-permissions/recap-options",
  getCustomerLatePaymentRecapOptionsHandler,
);

/* =========================================
   CUSTOMER - CREATE PERMISSION
========================================= */

/**
 * POST /api/customer/late-payment-permissions
 *
 * Membuat pengajuan ijin telat bayar
 * atas nama customer yang sedang login.
 *
 * member_id TIDAK dipercaya dari body request.
 * Controller mengambil member_id dari JWT customer.
 */
customerLatePaymentPermissionRoutes.post(
  "/late-payment-permissions",
  createCustomerLatePaymentPermissionHandler,
);

/* =========================================
   NOTE
========================================= */

/**
 * Tidak ada lagi route:
 *
 * PATCH /:id/mark-paid
 *
 * karena status ijin sekarang otomatis
 * menjadi "paid" ketika seluruh payment
 * yang terkait dengan ijin tersebut
 * sudah berstatus "paid".
 */

export default router;