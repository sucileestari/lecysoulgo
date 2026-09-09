import { Router } from "express";

import {
  getMarketplaceOrdersHandler,
  getMarketplaceMemberOptionsHandler,
  getAvailableMarketplaceItemsHandler,
  createMarketplaceOrderHandler,
} from "../controllers/marketplaceOrderController.js";

const router = Router();

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

export default router;
