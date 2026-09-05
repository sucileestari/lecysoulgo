import type {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

import {
  getAuthUserById,
} from "../services/authService.js";

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

type JwtPayload = {
  sub?: unknown;
  iat?: number;
  exp?: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        username: string;
        roleId: string;
        role: string;
        permissions: string[];
        isActive: boolean;
      };
    }
  }
}

/* =========================================
   AUTHENTICATE
========================================= */

export async function authenticate(
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
        message:
          "Token tidak ditemukan.",
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
        message:
          "Token tidak ditemukan.",
      });
    }

    /* =====================================
       VERIFY JWT
    ===================================== */

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET,
      ) as JwtPayload;

    /* =====================================
       VALIDATE USER ID
    ===================================== */

    if (
      typeof decoded.sub !==
      "string" ||
      !decoded.sub
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Token user tidak valid.",
      });
    }

    /* =====================================
       GET CURRENT USER FROM DATABASE
    ===================================== */

    const user =
      await getAuthUserById(
        decoded.sub,
      );

    /* =====================================
       VALIDATE ACTIVE STATUS
    ===================================== */

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message:
          "Akun tidak aktif.",
      });
    }

    /* =====================================
       SET AUTH USER
    ===================================== */

    req.user = {
      id: user.id,

      name: user.name,

      username:
        user.username,

      roleId:
        user.role_id,

      role:
        user.role,

      permissions:
        user.permissions,

      isActive:
        user.is_active,
    };

    /* =====================================
       CONTINUE
    ===================================== */

    return next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error,
    );

    return res.status(401).json({
      success: false,
      message:
        "Token tidak valid atau sudah expired.",
    });
  }
}