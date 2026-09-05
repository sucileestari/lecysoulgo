import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";

import memberRoutes from "./routes/memberRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import recapRoutes from "./routes/recapRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import latePaymentPermissionRoutes from "./routes/latePaymentPermissionRoutes.js";
import manualShippingBatchRoutes from "./routes/manualShippingBatchRoutes.js";
import manualShippingRoutes from "./routes/manualShippingRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import rolePermissionRoutes from "./routes/rolePermissionRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";

import { errorHandler } from "./middleware/errorHandler.js";

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

/*
 * Mengizinkan frontend mengakses API.
 *
 * Development:
 * FRONTEND_URL=http://localhost:5173
 *
 * Production:
 * FRONTEND_URL=https://domain-frontend-kamu
 */

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

/*
 * Parser untuk JSON request.
 *
 * Upload gambar menggunakan Multer
 * dengan multipart/form-data.
 *
 * Limit 1mb cukup untuk request JSON
 * karena file tidak dikirim melalui parser ini.
 */

app.use(
  express.json({
    limit: "1mb",
  }),
);

/* =========================================
   HEALTH CHECK
========================================= */

/**
 * GET /api/health
 *
 * Digunakan untuk memastikan
 * backend berjalan dengan normal.
 */

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

/*
 * CUSTOMER AUTH
 *
 * POST /api/customer/access
 * GET  /api/customer/me
 * GET  /api/customer/dashboard
 * GET  /api/customer/recaps
 */

app.use(
  "/api/customer",
  customerRoutes,
);

/*
 * ADMIN AUTH
 *
 * POST /api/auth/login
 * GET  /api/auth/me
 */

app.use(
  "/api/auth",
  authRoutes,
);

/* =========================================
   ROLE & PERMISSION ROUTES
========================================= */

/**
 * GET
 * /api/roles
 *
 * GET
 * /api/roles/permissions
 *
 * GET
 * /api/roles/:roleId/permissions
 *
 * POST
 * /api/roles
 *
 * PUT
 * /api/roles/:roleId
 *
 * DELETE
 * /api/roles/:roleId
 *
 * PUT
 * /api/roles/:roleId/permissions
 *
 * Semua endpoint diamankan oleh:
 *
 * authenticate
 * +
 * requirePermission
 *
 * di dalam rolePermissionRoutes.
 */

app.use(
  "/api/roles",
  rolePermissionRoutes,
);

/* =========================================
   MEMBER ROUTES
========================================= */

/**
 * GET    /api/members
 * GET    /api/members/:id
 * POST   /api/members
 * PUT    /api/members/:id
 * DELETE /api/members/:id
 *
 * Tidak menggunakan global rate limiter
 * karena endpoint data memang sering
 * diakses oleh frontend.
 */

app.use(
  "/api/members",
  memberRoutes,
);

/* =========================================
   BATCH ROUTES
========================================= */

/**
 * GET    /api/batches
 * GET    /api/batches/:id
 * POST   /api/batches
 * PUT    /api/batches/:id
 * DELETE /api/batches/:id
 *
 * Tidak menggunakan global rate limiter.
 */

app.use(
  "/api/batches",
  batchRoutes,
);

/* =========================================
   RECAP ROUTES
========================================= */

/**
 * GET
 * /api/recaps?batch_id=UUID
 *
 * POST
 * /api/recaps
 *
 * DELETE
 * /api/recaps/:id
 *
 * Tidak menggunakan global rate limiter.
 */

app.use(
  "/api/recaps",
  recapRoutes,
);

/* =========================================
   PAYMENT ROUTES
========================================= */

/**
 * CURRENT ENDPOINTS
 *
 * GET
 * /api/payments/recap/:recapId
 *
 * GET
 * /api/payments/recap/:recapId/history
 *
 * POST
 * /api/payments
 *
 * POST
 * /api/payments/:id/simulate-success
 *
 *
 * MIDTRANS ENDPOINTS
 *
 * POST
 * /api/payments/midtrans/create
 *
 * POST
 * /api/payments/midtrans/webhook
 *
 *
 * IMPORTANT:
 *
 * Midtrans webhook tidak menggunakan
 * global rate limiter.
 *
 * Keamanan webhook dilakukan dengan
 * verifikasi signature dari Midtrans.
 */

app.use(
  "/api/payments",
  paymentRoutes,
);

/* =========================================
   WHATSAPP ROUTES
========================================= */

/**
 * POST
 * /api/whatsapp/send
 *
 * Digunakan untuk mengirim pesan WhatsApp
 * melalui Fonnte.
 *
 * Flow:
 *
 * Frontend
 *    ↓
 * Backend GO
 *    ↓
 * WhatsApp Service
 *    ↓
 * Fonnte API
 *    ↓
 * WhatsApp
 *
 * FONNTE_TOKEN disimpan di backend .env
 * dan tidak boleh dikirim ke frontend.
 */

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

/**
 * GET
 * /api/manual-shipping-batches
 *
 * GET
 * /api/manual-shipping-batches/:id
 *
 * POST
 * /api/manual-shipping-batches
 *
 * PUT
 * /api/manual-shipping-batches/:id
 *
 * DELETE
 * /api/manual-shipping-batches/:id
 */

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
   API 404 HANDLER
========================================= */

/*
 * Harus diletakkan SETELAH
 * seluruh API routes.
 *
 * Endpoint API yang tidak ditemukan
 * tetap mengembalikan JSON.
 */

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

/*
 * Harus diletakkan paling akhir.
 */

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