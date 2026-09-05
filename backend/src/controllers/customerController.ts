import type {
  Request,
  Response,
} from "express";

import {
  loginCustomerByPhone,
} from "../services/customerService.js";

import {
  getCustomerDashboard,
} from "../services/customerDashboardService.js";

import {
  getCustomerRecaps,
} from "../services/customerRecapService.js";

/* =========================================
   CUSTOMER ACCESS
========================================= */

/**
 * POST /api/customer/access
 *
 * Customer masuk menggunakan nomor WhatsApp.
 *
 * Jika nomor ditemukan di members:
 * - generate customer token
 * - return data member
 *
 * Jika tidak ditemukan:
 * - return MEMBER_NOT_FOUND
 * - frontend akan mengarahkan ke Rules GO
 */
export async function customerAccessHandler(
  req: Request,
  res: Response,
) {
  try {
    const { phone } = req.body;

    const result =
      await loginCustomerByPhone(phone);

    return res.status(200).json({
      success: true,
      message:
        "Customer berhasil diverifikasi.",
      data: result,
    });
  } catch (error) {
    /* -------------------------------------
       MEMBER TIDAK DITEMUKAN
    ------------------------------------- */

    if (
      error instanceof Error &&
      error.name === "MEMBER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        code: "MEMBER_NOT_FOUND",
        message:
          "Nomor WhatsApp belum terdaftar sebagai member.",
      });
    }

    /* -------------------------------------
       NOMOR WA TIDAK VALID
    ------------------------------------- */

    if (
      error instanceof Error &&
      (
        error.message ===
          "Nomor WhatsApp wajib diisi." ||
        error.message ===
          "Nomor WhatsApp tidak valid."
      )
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PHONE",
        message: error.message,
      });
    }

    /* -------------------------------------
       ERROR LAIN
    ------------------------------------- */

    console.error(
      "customerAccessHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Terjadi kesalahan saat memverifikasi customer.",
    });
  }
}

/* =========================================
   CUSTOMER ME
========================================= */

/**
 * GET /api/customer/me
 *
 * Mengambil identitas customer yang sedang
 * terautentikasi berdasarkan customer token.
 *
 * Authorization:
 * Bearer <customer_token>
 *
 * Middleware:
 * authenticateCustomer
 */
export async function customerMeHandler(
  req: Request,
  res: Response,
) {
  try {
    /* -------------------------------------
       CEK CUSTOMER AUTH
    ------------------------------------- */

    if (!req.customer) {
      return res.status(401).json({
        success: false,
        code: "CUSTOMER_UNAUTHENTICATED",
        message:
          "Customer belum terautentikasi.",
      });
    }

    /* -------------------------------------
       RETURN CUSTOMER IDENTITY
    ------------------------------------- */

    return res.status(200).json({
      success: true,
      message:
        "Data customer berhasil diambil.",
      data: {
        member_id:
          req.customer.member_id,

        user_type:
          req.customer.user_type,
      },
    });
  } catch (error) {
    console.error(
      "customerMeHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Gagal mengambil data customer.",
    });
  }
}

/* =========================================
   CUSTOMER DASHBOARD
========================================= */

/**
 * GET /api/customer/dashboard
 *
 * Mengambil data dashboard customer.
 *
 * PENTING:
 * member_id TIDAK diambil dari:
 * - req.body
 * - req.query
 * - req.params
 *
 * member_id diambil langsung dari
 * customer token melalui:
 *
 * req.customer.member_id
 *
 * Middleware:
 * authenticateCustomer
 */
export async function customerDashboardHandler(
  req: Request,
  res: Response,
) {
  try {
    /* -------------------------------------
       CEK CUSTOMER AUTH
    ------------------------------------- */

    if (!req.customer) {
      return res.status(401).json({
        success: false,
        code: "CUSTOMER_UNAUTHENTICATED",
        message:
          "Customer belum terautentikasi.",
      });
    }

    /* -------------------------------------
       AMBIL MEMBER ID DARI TOKEN
    ------------------------------------- */

    const memberId =
      req.customer.member_id;

    if (!memberId) {
      return res.status(401).json({
        success: false,
        code: "CUSTOMER_INVALID_TOKEN",
        message:
          "Member ID tidak ditemukan pada token customer.",
      });
    }

    /* -------------------------------------
       AMBIL DATA DASHBOARD
    ------------------------------------- */

    const dashboard =
      await getCustomerDashboard(
        memberId,
      );

    /* -------------------------------------
       SUCCESS RESPONSE
    ------------------------------------- */

    return res.status(200).json({
      success: true,
      message:
        "Dashboard customer berhasil diambil.",
      data: dashboard,
    });
  } catch (error) {
    /* -------------------------------------
       MEMBER TIDAK DITEMUKAN
    ------------------------------------- */

    if (
      error instanceof Error &&
      error.name === "MEMBER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        code: "MEMBER_NOT_FOUND",
        message:
          "Data member tidak ditemukan.",
      });
    }

    /* -------------------------------------
       ERROR LAIN
    ------------------------------------- */

    console.error(
      "customerDashboardHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Gagal mengambil dashboard customer.",
    });
  }
}

/* =========================================
   CUSTOMER RECAPS
========================================= */

/**
 * GET /api/customer/recaps
 *
 * Mengambil seluruh rekapan milik customer
 * yang sedang login.
 *
 * PENTING:
 * member_id TIDAK BOLEH diambil dari:
 * - req.body
 * - req.query
 * - req.params
 *
 * member_id harus berasal dari customer token.
 *
 * Middleware:
 * authenticateCustomer
 */
export async function customerRecapsHandler(
  req: Request,
  res: Response,
) {
  try {
    /* -------------------------------------
       CEK CUSTOMER AUTH
    ------------------------------------- */

    if (!req.customer) {
      return res.status(401).json({
        success: false,
        code: "CUSTOMER_UNAUTHENTICATED",
        message:
          "Customer belum terautentikasi.",
      });
    }

    /* -------------------------------------
       AMBIL MEMBER ID DARI TOKEN
    ------------------------------------- */

    const memberId =
      req.customer.member_id;

    if (!memberId) {
      return res.status(401).json({
        success: false,
        code: "CUSTOMER_INVALID_TOKEN",
        message:
          "Member ID tidak ditemukan pada token customer.",
      });
    }

    /* -------------------------------------
       AMBIL REKAPAN CUSTOMER
    ------------------------------------- */

    const recaps =
      await getCustomerRecaps(
        memberId,
      );

    /* -------------------------------------
       SUCCESS RESPONSE
    ------------------------------------- */

    return res.status(200).json({
      success: true,
      message:
        "Rekapan customer berhasil diambil.",
      data: {
        recaps,
      },
    });
  } catch (error) {
    /* -------------------------------------
       MEMBER TIDAK DITEMUKAN
    ------------------------------------- */

    if (
      error instanceof Error &&
      error.name === "MEMBER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        code: "MEMBER_NOT_FOUND",
        message:
          "Data member tidak ditemukan.",
      });
    }

    /* -------------------------------------
       ERROR LAIN
    ------------------------------------- */

    console.error(
      "customerRecapsHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Gagal mengambil rekapan customer.",
    });
  }
}