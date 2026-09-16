import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";

import memberRoutes from "../routes/memberRoutes.js";
import batchRoutes from "../routes/batchRoutes.js";
import productCostRoutes from "../routes/productCostRoutes.js";
import recapRoutes from "../routes/recapRoutes.js";
import paymentRoutes from "../routes/paymentRoutes.js";
import latePaymentPermissionRoutes from "../routes/latePaymentPermissionRoutes.js";
import manualShippingBatchRoutes from "../routes/manualShippingBatchRoutes.js";
import manualShippingRoutes from "../routes/manualShippingRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import customerRoutes from "../routes/customerRoutes.js";
import rolePermissionRoutes from "../routes/rolePermissionRoutes.js";
import whatsappRoutes from "../routes/whatsappRoutes.js";
import bankAccountRoutes from "../routes/bankAccountRoutes.js";
import financeRoutes from "../routes/financeRoutes.js";
import marketplaceOrderRoutes from "../routes/marketplaceOrderRoutes.js";
import notificationRoutes from "../routes/notificationRoutes.js";

import { errorHandler } from "../middleware/errorHandler.js";

/* =========================================
   APP
========================================= */

const app = express();

/* =========================================
   CONFIGURATION
========================================= */

const PORT =
  Number(process.env.PORT) || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL?.trim();

if (!FRONTEND_URL) {
  throw new Error(
    "FRONTEND_URL belum diatur di environment variables.",
  );
}

/* =========================================
   SECURITY HEADERS
========================================= */

app.use(
  helmet(),
);

/* =========================================
   CORS
========================================= */

app.use(
  cors({
    origin: FRONTEND_URL,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  }),
);

/* =========================================
   BODY PARSER
========================================= */

app.use(
  express.json({
    limit: "1mb",
  }),
);

/* =========================================
   HEALTH CHECK
========================================= */

app.get(
  "/api/health",
  (_req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "GO API is running",
    });
  },
);

/* =========================================
   AUTH ROUTES
========================================= */

app.use(
  "/api/customer",
  customerRoutes,
);

app.use(
  "/api/auth",
  authRoutes,
);

/* =========================================
   ROLE & PERMISSION ROUTES
========================================= */

app.use(
  "/api/roles",
  rolePermissionRoutes,
);

/* =========================================
   MEMBER ROUTES
========================================= */

app.use(
  "/api/members",
  memberRoutes,
);

/* =========================================
   BATCH ROUTES
========================================= */

app.use(
  "/api/batches",
  batchRoutes,
);

/* =========================================
   PRODUCT COST ROUTES
========================================= */

app.use(
  "/api/product-costs",
  productCostRoutes,
);

/* =========================================
   RECAP ROUTES
========================================= */

app.use(
  "/api/recaps",
  recapRoutes,
);

/* =========================================
   PAYMENT ROUTES
========================================= */

app.use(
  "/api/payments",
  paymentRoutes,
);

/* =========================================
   WHATSAPP ROUTES
========================================= */

app.use(
  "/api/whatsapp",
  whatsappRoutes,
);

/* =========================================
   LATE PAYMENT PERMISSION ROUTES
========================================= */

app.use(
  "/api/late-payment-permissions",
  latePaymentPermissionRoutes,
);

/* =========================================
   MANUAL SHIPPING BATCH ROUTES
========================================= */

app.use(
  "/api/manual-shipping-batches",
  manualShippingBatchRoutes,
);

/* =========================================
   MANUAL SHIPPING ROUTES
========================================= */

app.use(
  "/api/manual-shipments",
  manualShippingRoutes,
);

/* =========================================
   BANK ACCOUNT ROUTES
========================================= */

app.use(
  "/api/bank-accounts",
  bankAccountRoutes,
);

/* =========================================
   FINANCE ROUTES
========================================= */

app.use(
  "/api/finance",
  financeRoutes,
);

/* =========================================
   MARKETPLACE ORDER ROUTES
========================================= */

app.use(
  "/api/marketplace-orders",
  marketplaceOrderRoutes,
);

/* =========================================
   NOTIFICATION AUTOMATION ROUTES
========================================= */

/**
 * POST
 * /api/notifications/process
 *
 * Dipanggil oleh scheduler/cron untuk
 * memproses automation WhatsApp.
 */

app.use(
  "/api/notifications",
  notificationRoutes,
);

/* =========================================
   API 404 HANDLER
========================================= */

app.use(
  "/api",
  (_req, res) => {
    return res.status(404).json({
      success: false,
      message:
        "API endpoint tidak ditemukan.",
    });
  },
);

/* =========================================
   GLOBAL ERROR HANDLER
========================================= */

app.use(
  errorHandler,
);

/* =========================================
   START SERVER
========================================= */

export default app;

if (!process.env.VERCEL) {
  app.listen(
    PORT,
    () => {
      console.log(
        `API running on port ${PORT}`,
      );

      console.log(
        `Frontend URL: ${FRONTEND_URL}`,
      );
    },
  );
}
