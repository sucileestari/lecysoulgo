import {
Router,
} from "express";

import {
getLatePaymentPermissionsHandler,
getLatePaymentRecapOptionsHandler,
createLatePaymentPermissionHandler,
} from "../controllers/latePaymentPermissionController.js";

import {
authenticate,
} from "../middleware/authMiddleware.js";

const router =
Router();

/* =========================================
ALL ROUTES REQUIRE LOGIN
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
* * unpaid
* * paid
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
* * semua member
* * barang yang memenuhi syarat
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
