import type {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

import { supabase } from "../config/supabase.js";

/* =========================================
   JWT CONFIG
========================================= */

const JWT_SECRET = (
  process.env.JWT_SECRET ?? ""
).trim();

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET belum diatur di environment variables.",
  );
}

/* =========================================
   TYPES
========================================= */

export type CustomerAuthPayload = {
  sub: string;
  user_type: "customer";
  member_id: string;
  iat?: number;
  exp?: number;
};

declare global {
  namespace Express {
    interface Request {
      customer?: CustomerAuthPayload;
    }
  }
}

/* =========================================
   AUTHENTICATE CUSTOMER
========================================= */

export async function authenticateCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    /* =====================================
       GET AUTHORIZATION HEADER
    ===================================== */

    const authorization =
      req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        code:
          "CUSTOMER_UNAUTHENTICATED",
        message:
          "Customer belum terautentikasi.",
      });
    }

    /* =====================================
       VALIDATE BEARER FORMAT
    ===================================== */

    if (
      !authorization.startsWith(
        "Bearer ",
      )
    ) {
      return res.status(401).json({
        success: false,
        code:
          "INVALID_AUTHORIZATION",
        message:
          "Format Authorization tidak valid.",
      });
    }

    /* =====================================
       GET TOKEN
    ===================================== */

    const token =
      authorization
        .slice(7)
        .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        code:
          "CUSTOMER_TOKEN_MISSING",
        message:
          "Token customer tidak ditemukan.",
      });
    }

    /* =====================================
       VERIFY JWT
    ===================================== */

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET,
      );

    /* =====================================
       VALIDATE PAYLOAD
    ===================================== */

    if (
      typeof decoded !==
      "object" ||
      decoded === null
    ) {
      return res.status(401).json({
        success: false,
        code:
          "CUSTOMER_INVALID_TOKEN",
        message:
          "Token customer tidak valid.",
      });
    }

    const payload =
      decoded as Partial<CustomerAuthPayload>;

    /* =====================================
       VALIDATE TOKEN TYPE
    ===================================== */

    if (
      payload.user_type !==
      "customer"
    ) {
      return res.status(403).json({
        success: false,
        code:
          "NOT_CUSTOMER_TOKEN",
        message:
          "Token bukan token customer.",
      });
    }

    /* =====================================
       VALIDATE CUSTOMER ID
    ===================================== */

    if (
      typeof payload.sub !==
        "string" ||
      !payload.sub
    ) {
      return res.status(401).json({
        success: false,
        code:
          "CUSTOMER_INVALID_TOKEN",
        message:
          "Identitas customer tidak valid.",
      });
    }

    if (
      typeof payload.member_id !==
        "string" ||
      !payload.member_id
    ) {
      return res.status(401).json({
        success: false,
        code:
          "CUSTOMER_INVALID_TOKEN",
        message:
          "Member ID tidak ditemukan pada token.",
      });
    }

    /* =====================================
       VALIDATE SUB & MEMBER ID
    ===================================== */

    if (
      payload.sub !==
      payload.member_id
    ) {
      return res.status(401).json({
        success: false,
        code:
          "CUSTOMER_INVALID_TOKEN",
        message:
          "Identitas customer pada token tidak valid.",
      });
    }

    /* =====================================
       CHECK MEMBER
    ===================================== */

    const {
      data: member,
      error,
    } = await supabase
      .from("members")
      .select("id")
      .eq(
        "id",
        payload.member_id,
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Customer member validation error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal memverifikasi data customer.",
      });
    }

    /* =====================================
       MEMBER TIDAK ADA
    ===================================== */

    if (!member) {
      return res.status(401).json({
        success: false,
        code:
          "MEMBER_NOT_FOUND",
        message:
          "Data customer tidak ditemukan.",
      });
    }

    /* =====================================
       SET CUSTOMER SESSION
    ===================================== */

    req.customer = {
      sub: payload.sub,

      user_type:
        "customer",

      member_id:
        payload.member_id,

      ...(typeof payload.iat ===
      "number"
        ? {
            iat: payload.iat,
          }
        : {}),

      ...(typeof payload.exp ===
      "number"
        ? {
            exp: payload.exp,
          }
        : {}),
    };

    /* =====================================
       CONTINUE
    ===================================== */

    return next();
  } catch (error) {
    console.error(
      "authenticateCustomer error:",
      error,
    );

    return res.status(401).json({
      success: false,
      code:
        "CUSTOMER_SESSION_INVALID",
      message:
        "Token customer tidak valid atau sudah expired.",
    });
  }
}