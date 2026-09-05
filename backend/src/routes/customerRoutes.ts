import { Router } from "express";

import {
  customerAccessHandler,
  customerMeHandler,
  customerDashboardHandler,
  customerRecapsHandler,
} from "../controllers/customerController.js";

import {
  authenticateCustomer,
} from "../middleware/customerAuthMiddleware.js";

const router = Router();

/* =========================================
   CUSTOMER ACCESS
========================================= */

/**
 * POST /api/customer/access
 *
 * Login customer menggunakan nomor WhatsApp.
 *
 * Response:
 * - Customer Token
 * - Data member
 *
 * Jika nomor belum terdaftar:
 * - HTTP 404
 * - code = MEMBER_NOT_FOUND
 */
router.post(
  "/access",
  customerAccessHandler,
);

/* =========================================
   CUSTOMER PROFILE
========================================= */

/**
 * GET /api/customer/me
 *
 * Mengambil informasi customer yang
 * sedang terautentikasi.
 *
 * Authorization:
 * Bearer <customer_token>
 */
router.get(
  "/me",
  authenticateCustomer,
  customerMeHandler,
);

/* =========================================
   CUSTOMER DASHBOARD
========================================= */

/**
 * GET /api/customer/dashboard
 *
 * Mengambil ringkasan dashboard customer.
 *
 * member_id diambil dari customer token,
 * bukan dari request frontend.
 *
 * Authorization:
 * Bearer <customer_token>
 */
router.get(
  "/dashboard",
  authenticateCustomer,
  customerDashboardHandler,
);

/* =========================================
   REKAPAN SAYA
========================================= */

/**
 * GET /api/customer/recaps
 *
 * Mengambil seluruh rekapan milik customer
 * yang sedang terautentikasi.
 *
 * member_id diambil dari:
 *
 * req.customer.member_id
 *
 * BUKAN dari:
 * - req.body
 * - req.query
 * - req.params
 *
 * Authorization:
 * Bearer <customer_token>
 */
router.get(
  "/recaps",
  authenticateCustomer,
  customerRecapsHandler,
);

export default router;