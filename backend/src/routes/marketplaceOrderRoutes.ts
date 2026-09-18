import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Router } from "express";

import jwt from "jsonwebtoken";

import {
  getMarketplaceOrdersHandler,
  getMarketplaceMemberOptionsHandler,
  getAvailableMarketplaceItemsHandler,
  createMarketplaceOrderHandler,
  updateMarketplaceOrderStatusHandler,
  deleteMarketplaceOrderHandler,
} from "../controllers/marketplaceOrderController.js";

import { authenticate } from "../middleware/authMiddleware.js";

import {
  authenticateCustomer,
} from "../middleware/customerAuthMiddleware.js";

const router = Router();

/* =========================================
   AUTHENTICATE MARKETPLACE DELETE
========================================= */

/**
 * DELETE Marketplace dapat diakses oleh:
 *
 * - Customer
 * - Admin
 * - Employee
 *
 * Customer token diarahkan ke
 * authenticateCustomer.
 *
 * Token admin/employee diarahkan ke
 * authenticate.
 *
 * jwt.decode() hanya digunakan untuk
 * menentukan jenis middleware.
 * Verifikasi token tetap dilakukan
 * oleh middleware masing-masing.
 */
async function authenticateMarketplaceDelete(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization =
    req.headers.authorization;

  if (!authorization) {
    return authenticate(
      req,
      res,
      next,
    );
  }

  if (
    !authorization.startsWith(
      "Bearer ",
    )
  ) {
    return authenticate(
      req,
      res,
      next,
    );
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (!token) {
    return authenticate(
      req,
      res,
      next,
    );
  }

  const decoded =
    jwt.decode(token);

  const isCustomerToken =
    typeof decoded ===
      "object" &&
    decoded !== null &&
    "user_type" in decoded &&
    decoded.user_type ===
      "customer";

  if (isCustomerToken) {
    return authenticateCustomer(
      req,
      res,
      next,
    );
  }

  return authenticate(
    req,
    res,
    next,
  );
}

/* =========================================
   GET MARKETPLACE ORDERS
========================================= */

/**
 * GET /api/marketplace-orders
 * GET /api/marketplace-orders?member_id=UUID
 *
 * Tanpa member_id mengambil seluruh pesanan
 * untuk kebutuhan admin.
 * Dengan member_id mengambil pesanan milik
 * member tertentu untuk kebutuhan customer.
 */
router.get(
  "/",
  getMarketplaceOrdersHandler,
);

/* =========================================
   GET MEMBER OPTIONS
========================================= */

/**
 * GET /api/marketplace-orders/member-options
 *
 * Mengambil pembeli yang pernah muncul di Rekapan.
 */
router.get(
  "/member-options",
  getMarketplaceMemberOptionsHandler,
);

/* =========================================
   GET AVAILABLE ITEMS
========================================= */

/**
 * GET /api/marketplace-orders/available-items
 * GET /api/marketplace-orders/available-items?member_id=UUID
 *
 * Tanpa member_id mengambil seluruh barang
 * yang eligible untuk kebutuhan admin.
 * Dengan member_id mengambil barang eligible
 * milik member tertentu untuk kebutuhan customer.
 */
router.get(
  "/available-items",
  getAvailableMarketplaceItemsHandler,
);

/* =========================================
   CREATE MARKETPLACE ORDER
========================================= */

/**
 * POST /api/marketplace-orders
 *
 * member_id dikirim oleh frontend.
 * Backend tetap memvalidasi member dan barang.
 */
router.post(
  "/",
  createMarketplaceOrderHandler,
);

/* =========================================
   UPDATE MARKETPLACE ORDER STATUS
========================================= */

/**
 * PUT /api/marketplace-orders/:id/status
 *
 * Mengubah status pesanan Marketplace.
 * Jika status menjadi "processed" ("Sudah di pick up"),
 * Rekapan terkait otomatis menjadi sudah_co = true.
 *
 * Endpoint ini membutuhkan authentication,
 * sehingga customer tidak dapat mengubah status
 * pesanan Marketplace melalui backend.
 */
router.put(
  "/:id/status",
  authenticate,
  updateMarketplaceOrderStatusHandler,
);

/* =========================================
   DELETE MARKETPLACE ORDER
========================================= */

/**
 * DELETE /api/marketplace-orders/:id
 *
 * Customer, Admin, dan Employee dapat
 * menghapus pesanan sesuai aturan backend.
 *
 * Customer hanya dapat menghapus pesanan
 * miliknya sendiri.
 *
 * Member HNR tetap tidak dapat menghapus.
 */
router.delete(
  "/:id",
  authenticateMarketplaceDelete,
  deleteMarketplaceOrderHandler,
);

export default router;